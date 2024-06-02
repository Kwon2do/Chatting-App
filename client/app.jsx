'use strict';

var React = require('react');
var Signup = require('./signup.jsx');
var ChatApp = require('./chat.jsx');
var ChattingRoom = require('./chattingroomList.jsx');
var JoinedChattingRoom = require('./joinedchatting.jsx')
var axios = require('axios'); // axios 임포트
const JoinedRoom = require('./joinedchatting.jsx');

var App = React.createClass({

    getInitialState() {
        return { page: 'signup', user: null, roomName: '' };
    },

    handleSignup(name) {
        this.setState({ user: name, page: "signup" });
        alert("회원가입이 완료되었습니다");
    },
    
    handleSignin(name, id) {
        this.setState({ user: name, userId: id, page: "chattingroom" });
    },
    
    handleChangePage(page) {
        this.setState({ page: page });
    },
    
    handleRoomSelect(roomId) {
        // roomId를 상태에 설정하고 chat 페이지로 전환
        this.setState({ roomId: roomId });
        // 채팅방 ID를 사용하여 채팅방 이름을 가져오는 API 호출
        axios.get(`/api/rooms/${roomId}`)
            .then(response => {
                this.setState({ roomname: response.data.roomname, page: 'chat' });
            })
            .catch(error => {
                console.error("채팅방 이름을 가져오는 중 오류 발생:", error);
            });
    },
    onClickBackBtn(){
        this.setState({page:"chattingroom"});
    },
    onClickJoinedRoom(){
        this.setState({page:"joinedchatting"});
    },

    render() {
        var Page;
        switch (this.state.page) {
            case 'signup':
                Page = <Signup onSignup={this.handleSignup} onSignin={this.handleSignin} onChangePage={this.handleChangePage} />;
                break;
            case 'chat':
                Page = <ChatApp roomId={this.state.roomId} roomname={this.state.roomname} userId={this.state.userId} user={this.state.user} onClickBackBtn={this.onClickBackBtn}/>;
                break;
            case 'chattingroom':
                Page = <ChattingRoom onRoomSelect={this.handleRoomSelect} handleChangePage={this.handleChangePage} onClickJoinedRoom={this.onClickJoinedRoom}/>;
                break;
            case 'joinedchatting':
                Page = <JoinedRoom userId={this.state.userId} onClickBackBtn={this.onClickBackBtn} onRoomSelect={this.handleRoomSelect}/>;
                break;    
        }

        return (
            <div>
            {Page}
            </div>
        );
    }
});

React.render(<App />, document.getElementById('app'));
