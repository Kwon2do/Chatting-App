"use strict";

/**
 * Module dependencies.
 */

var express = require("express");
var http = require("http");
const bodyParser = require("body-parser");
var socket = require("./routes/socket.js");
const db = require("./db.js");
const conn = db.init();
db.connect(conn);
var app = express();
var server = http.createServer(app);
console.log(__dirname);

/* Configuration */
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.set("port", process.env.PORT || 3000);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

/*회원가입*/
app.post("/api/sign-up", (req, res) => {
  const { userId, password } = req.body;
  const checkQuery = "SELECT * FROM USERS WHERE userId = ?";

  conn.query(checkQuery, [userId], (checkError, checkResults) => {
    if (checkError) {
      console.error(checkError);
      return res.status(500).send("서버 에러가 발생했습니다");
    }

    if (checkResults.length > 0) {
      // 이미 존재하는 아이디
      return res.status(409).send("⚠️이미 존재하는 아이디입니다");
    }

    const query = "INSERT INTO USERS (userId, password) VALUES (?, ?)";
    conn.query(query, [userId, password], (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).send("서버 에러가 발생했습니다");
      }
      res.status(200).send("유저 정보를 DB에 저장했습니다");
    });
  });
});

/*로그인*/
app.get("/api/sign-in", (req, res) => {
  const { userId, password } = req.query;
  const query = "SELECT * FROM USERS WHERE userId = ? AND password = ?";
  conn.query(query, [userId, password], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("서버 에러가 발생했습니다");
    }
    if (results.length > 0) {
      res.status(200).send(results[0]);
    } else {
      res.status(401).send("아이디 또는 비밀번호가 일치하지 않습니다");
    }
  });
});

/*채팅방 목록*/
app.get("/api/chatting-room", (req, res) => {
  const query = "SELECT * FROM chattingroom";
  conn.query(query, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).send("존재하지 않습니다");
    }
    res.send(results);
  });
});

/*채팅방 이름*/
app.get("/api/rooms/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  const query = "SELECT roomname FROM chattingroom WHERE roomId = ?";

  conn.query(query, [roomId], (err, result) => {
    if (err) {
      console.error("Error fetching room name:", err);
      res.status(500).send("Server error");
      return;
    }
    if (result.length > 0) {
      res.send({ roomname: result[0].roomname });
    } else {
      res.status(404).send("Room not found");
    }
  });
});
/* 채팅방 생성 */
app.post("/api/rooms/create", (req, res) => {
  const roomname = req.body.roomname;
  const query = "INSERT INTO chattingroom (roomname) VALUES (?)";
  conn.query(query, [roomname], (err, result) => {
    if (err) {
      console.error(err);
      res.status(500).send("채팅방 생성에 실패했습니다.");
      return;
    }
    const roomId = result.insertId; // Retrieve the roomId from the result
    res.json({ roomId: roomId }); // Send the roomId as JSON response
  });
});

// JSON 및 URL-encoded 파싱을 위한 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* Routes */
app.get("/", function (req, res) {
  res.render("index");
});

/* Socket.io Communication */
var io = require("socket.io")(server);

io.on("connection", (socket) => {
  console.log("A user connected");
  // 유저 목록 저장
  const users = {};
  // 새로운 사용자가 채팅방에 입장했을 때 처리
  socket.on("user:join", (user) => {
    // 새로운 사용자를 목록에 추가
    users[socket.id] = user;
    console.log(user);
    // 모든 클라이언트에게 업데이트된 사용자 목록을 전달
    io.emit("update:users", Object.values(users));
  });

  // 클라이언트로부터 요청이 있을 때 해당 채팅방의 메시지를 DB에서 가져오는 함수 추가
  function fetchMessagesFromDatabase(socket, roomId, callback) {
    const query = `
    SELECT messages.message, messages.createdAt, users.userId 
    FROM messages 
    JOIN users ON messages.id = users.id
    WHERE messages.roomId = ?
    ORDER BY messages.createdAt ASC
  `;
    conn.query(query, [roomId], (error, results, fields) => {
      if (error) {
        console.error("Error fetching messages from database:", error);
        callback(error, null); // 에러가 발생했을 때 콜백 호출
      } else {
        // 클라이언트에게 메시지 전송
        socket.emit("get:messages", results);
        callback(null, results); // 결과를 콜백 호출
      }
    });
  }

  socket.on("get:messages", function (roomId) {
    fetchMessagesFromDatabase(socket, roomId, (error, messages) => {
      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        console.log("Fetched messages:", messages);
        // 클라이언트에게 한 번만 응답 보내기
      }
    });
  });

  socket.on("send:message", (data) => {
    console.log(data);
    const query = "INSERT INTO messages (roomId, id, message) VALUES (?, ?, ?)";
    conn.query(query, [data.roomId, data.id, data.text], (err, results) => {
      if (err) {
        console.error("Error inserting message: " + err);
        return;
      }
      console.log("메시지 DB에 저장 완료: " + results.insertId);

      // 저장된 메시지를 클라이언트에게 보냅니다.
      socket.broadcast.emit("send:message", {
        user: data.user,
        text: data.text,
        roomId: data.roomId,
      });
    });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});
/* Start server */
server.listen(app.get("port"), function () {
  console.log(
    "Express server listening on port %d in %s mode",
    app.get("port"),
    app.get("env")
  );
});

module.exports = app;
