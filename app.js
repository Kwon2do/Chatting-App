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
      return res.status(500).json({ error: "서버 에러가 발생했습니다" });
    }

    if (checkResults.length > 0) {
      // 이미 존재하는 아이디
      return res.status(409).json({ error: "⚠️이미 존재하는 아이디입니다" });
    }

    const query = "INSERT INTO USERS (userId, password) VALUES (?, ?)";
    conn.query(query, [userId, password], (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ error: "서버 에러가 발생했습니다" });
      }
      res.status(200).json({ message: "유저 정보를 DB에 저장했습니다" });
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
    const roomId = result.insertId;
    res.json({ roomId: roomId });
  });
});
/*참여중인 채팅방 목록*/
app.get("/api/joined-roomlist/:userId", (req, res) => {
  const userId = req.params.userId; // 요청에서 사용자 ID를 가져옴
  const query = `
    SELECT chat.roomname, chat.roomId
    FROM messages AS m
    JOIN chattingroom AS chat ON m.roomId = chat.roomId
    WHERE m.id = ?
  `;
  conn.query(query, [userId], (error, results) => {
    if (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.status(200).json(results); // 결과를 클라이언트에게 반환
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

  //클라이언트에서 roomId 전달받아서 db에서 메시지 목록 가져오기
  function fetchDBMessages(socket, roomId) {
    const query = `
    SELECT messages.message, messages.createdAt, users.userId 
    FROM messages 
    JOIN users ON messages.id = users.id
    WHERE messages.roomId = ?
    ORDER BY messages.createdAt ASC
  `;
    conn.query(query, [roomId], (error, results) => {
      if (error) {
        console.error("DB에서 데이터를 받아오지 못했습니다.", error);
      } else {
        //조회결과를 클라이언트에 전송
        socket.emit("get:messages", results);
      }
    });
  }

  socket.on("get:messages", function (roomId) {
    fetchDBMessages(socket, roomId, (error, messages) => {
      if (error) {
        console.error("DB에서 데이터를 받아오지 못했습니다.", error);
      } else {
        console.log("메시지목록 조회결과:", messages);
      }
    });
  });

  socket.on("send:message", (data) => {
    console.log(data);
    const query = "INSERT INTO messages (roomId, id, message) VALUES (?, ?, ?)";
    conn.query(query, [data.roomId, data.id, data.text], (err, results) => {
      if (err) {
        console.error("메시지 저장 실패 " + err);
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
