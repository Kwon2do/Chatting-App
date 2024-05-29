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

// Function to fetch messages from the database
function getMessages(callback) {
  // Replace this with the actual database query logic
  conn.query("SELECT * FROM messages", function (error, results) {
    if (error) {
      return callback(error);
    }
    callback(null, results);
  });
}

// Export function for listening to the socket
module.exports = function (socket) {
  socket.on("login", function (userId) {
    // Add the user ID to the list of user names
    userNames.addUser(userId);

    // Send the new user their name and a list of users
    socket.emit("init", {
      name: userId,
      users: userNames.getNames(),
    });

    // Notify other clients that a new user has joined
    socket.broadcast.emit("user:join", {
      name: userId,
    });

    // Handle request to fetch messages from the database
    socket.on("request:messages", function () {
      getMessages(function (error, messages) {
        if (error) {
          console.error("Error fetching messages:", error);
          return;
        }
        // Send message data to the client
        socket.emit("init", { messages: messages });
      });
    });
    // 클라이언트 연결 및 유저 목록 관리
    const users = {};

    io.on("connection", (socket) => {
      console.log("A user connected");

      // 새로운 사용자가 채팅방에 입장했을 때 처리
      socket.on("user:join", (user) => {
        // 새로운 사용자를 목록에 추가
        users[socket.id] = user;
        // 모든 클라이언트에게 업데이트된 사용자 목록을 전달
        io.emit("update:users", Object.values(users));
      });

      // 클라이언트가 연결 해제됐을 때 처리
      socket.on("disconnect", () => {
        delete users[socket.id];
        // 모든 클라이언트에게 업데이트된 사용자 목록을 전달
        io.emit("update:users", Object.values(users));
        console.log("A user disconnected");
      });
    });
    // Broadcast a user's message to other users
    socket.on("send:message", function (data) {
      socket.broadcast.emit("send:message", {
        user: userId,
        text: data.text,
      });
    });

    // Validate a user's name change, and broadcast it on success
    socket.on("change:name", function (data, fn) {
      if (userNames.claim(data.name)) {
        var oldName = userId;
        userNames.free(oldName);

        userId = data.name;

        socket.broadcast.emit("change:name", {
          oldName: oldName,
          newName: userId,
        });

        fn(true);
      } else {
        fn(false);
      }
    });
  });
};
