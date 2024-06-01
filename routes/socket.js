const db = require("../db.js");
const conn = db.init();
db.connect(conn);

// Keep track of which names are used so that there are no duplicates
var userNames = (function () {
  var names = {};

  var claim = function (name) {
    if (!name || names[name]) {
      return false;
    } else {
      names[name] = true;
      return true;
    }
  };

  var addUser = function (name) {
    if (!names[name]) {
      names[name] = true;
    }
  };

  // serialize claimed names as an array
  var getNames = function () {
    var res = [];
    for (var user in names) {
      res.push(user);
    }
    return res;
  };

  var free = function (name) {
    if (names[name]) {
      delete names[name];
    }
  };

  return {
    claim: claim,
    free: free,
    getNames: getNames,
    addUser: addUser,
  };
})();

//클라이언트(socket) 통신
module.exports = function (socket) {
  // Notify other clients that a new user has joined
  socket.broadcast.emit("user:join", {
    name: userId,
  });

  io.on("connection", (socket) => {
    console.log("A user connected");

    // 클라이언트가 연결 해제됐을 때 처리
    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });
  });
  socket.on("send:message", function (data) {
    //다른 사용자에게도 전파
    socket.broadcast.emit("send:message", {
      user: userId,
      text: data.text,
    });
  });
};
