import store from "@/plugins/lstore/lstore.js";
import api from "@/api/api.js";
import webim from "easemob-websdk";
import dataBase from "@/util/database.js";
import config from "./webim.config.js";
import vuex from "@/stores/index.js";

export const connect = token => {
  let conn = new webim.connection({
    isMultiLoginSessions: config.isMultiLoginSessions,
    https:
      typeof config.https === "boolean"
        ? config.https
        : location.protocol === "https:",
    url: config.xmppURL,
    heartBeatWait: config.heartBeatWait,
    autoReconnectNumMax: config.autoReconnectNumMax,
    autoReconnectInterval: config.autoReconnectInterval,
    apiUrl: config.apiURL,
    isAutoLogin: true
  });

  const mid = (store.getData("CURRENTUSER") || {}).id;
  // 添加成功的回调
  conn.listen({
    onOpened: message => {
      process.env.NODE_ENV !== "production" &&
        // eslint-disable-next-line
        console.log("连接打开=>", message);
    },
    onClosed: message => {
      process.env.NODE_ENV !== "production" &&
        // eslint-disable-next-line
        console.log(message);
    },
    // 收到文本消息
    onTextMessage: message => {
      let singleChatMsg = {
        txt: message.sourceMsg || "",
        uid: parseInt(message.from) || 0,
        touid: parseInt(message.to) || 0,
        type: message.type || "",
        easemob_mid: message.id || 0,
        mid: ~~message.to,
        time: new Date().valueOf()
      };
      vuex.dispatch("PUSH_NEW_MESSAGE", singleChatMsg);
    },
    onEmojiMessage: message => {
      process.env.NODE_ENV !== "production" &&
        // eslint-disable-next-line
        console.log("Emoji");
      var data = message.data;
      for (var i = 0, l = data.length; i < l; i++) {
        process.env.NODE_ENV !== "production" &&
          // eslint-disable-next-line
          console.log(data[i]);
      }
    },
    onPictureMessage: message => {
      process.env.NODE_ENV !== "production" &&
        // eslint-disable-next-line
        console.log("Location of Picture is ", message.url);
    },
    onReceivedMessage: message => {
      //收到消息送达服务器回执
      setTimeout(() => {
        dataBase.transaction("rw?", "message", () => {
          dataBase.message
            .where("id")
            .equals(message.id)
            .modify({
              easemob_id: message.mid,
              // 消息送达
              status: 1
            });
        });
      }, 800);
    },
    onDeliveredMessage: message => {
      //收到消息送达客户端回执
      process.env.NODE_ENV !== "production" &&
        // eslint-disable-next-line
        console.log("Delivered", message);
    },
    onInviteMessage: message => {
      process.env.NODE_ENV !== "production" &&
        // eslint-disable-next-line
        console.log("onInviteMessage", message);
    },
    onLocationMessage: message => {
      process.env.NODE_ENV !== "production" &&
        // eslint-disable-next-line
        console.log("onLocationMessage", message);
    }
  });
  // let localToken = WebIM.utils.getCookie("webim_" + uid);

  var options = {
    apiUrl: config.apiURL,
    user: mid,
    pwd: token,
    appKey: config.appkey,
    success: function(res) {
      var tokenAccess = res.access_token;
      webim.utils.setCookie("webim_" + mid, tokenAccess, 1);
    },
    error: function(msg) {
      // eslint-disable-next-line
      console.log(msg);
    }
  };
  conn.open(options);
  return conn;
};

export const getLocalId = (type, id) => {
  return new webim.message(type, id);
};

/**
 * 获取环信登录所需的密钥
 * @Author   Wayne
 * @DateTime 2018-03-31
 * @Email    qiaobin@zhiyicx.com
 * @return   {[type]}            [description]
 */
export const getEasemobPassword = async () => {
  const { data: { im_pwd_hash = "" } = {} } = await api.get(
    "easemob/password",
    {
      validateStatus: s => s === 201
    }
  );

  return im_pwd_hash || "";
};
