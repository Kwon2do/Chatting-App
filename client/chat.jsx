var React = require('react');
var socket = io.connect();

var UsersList = React.createClass({
    render() {
        return (
            <div className='users'>
                <h3> 참여자들 </h3>
                <ul>
                    {
                        this.props.users.map((user, i) => {
                            return (
                                <li key={i}>
                                    {user}
                                </li>
                            );
                        })
                    }
                </ul>                
            </div>
        );
    }
});

var Message = React.createClass({
    render() {
        const isOwnMessage = this.props.isOwnMessage;
        const messageClass = isOwnMessage ? 'message own' : 'message other';
        const alignmentClass = isOwnMessage ? 'align-right' : 'align-left';
        const createdAt = new Date(this.props.createdAt).toLocaleString('ko-KR', { dateStyle: 'long', timeStyle: 'medium' });

        return (
            <div className={`${messageClass} ${alignmentClass}`}>
                <strong>{this.props.user}: </strong>
                <span>{this.props.text}</span>
                <div className='message-date'>{createdAt!="Invalid Date"?{createdAt}:""}</div> {/* 생성 시간 표시 */}
            </div>
        );
    }
});

var MessageList = React.createClass({
    componentDidUpdate(prevProps) {
        if (this.props.messages.length !== prevProps.messages.length) {
            this.scrollToBottom();
        }
    },

    scrollToBottom() {
        this.messagesEnd.scrollIntoView({ behavior: "smooth" });
    },

    render() {
        const currentUser = this.props.currentUser;
        return (
            <div className='messages-container'>
                <div className='messages'>
                    {
                        this.props.messages.map((message, i) => (
                            <Message
                                key={i}
                                user={message.user}
                                text={message.text}
                                createdAt={message.createdAt}
                                isOwnMessage={message.user === currentUser}
                            />
                        ))
                    }
                    <div ref={(el) => { this.messagesEnd = el; }}></div>
                </div>
            </div>
        );
    }
});

var MessageForm = React.createClass({
    getInitialState() {
        return { text: '' };
    },

    handleSubmit(e) {
        e.preventDefault();
        var message = {
            id: this.props.userId,
            user: this.props.user,
            text: this.state.text,
            roomId: this.props.roomId,
            createdAt: new Date().toISOString() // 현재 시간을 ISO 형식으로 변환
        };
        this.props.onMessageSubmit(message);    
        this.setState({ text: '' });
    },

    changeHandler(e) {
        this.setState({ text: e.target.value });
    },

    render() {
        return(
            <div className='message_form_wrapper'>
                <div className='message_form'>
                    <form onSubmit={this.handleSubmit}>
                        <input
                            placeholder='메시지를 입력하세요'
                            className='textinput'
                            onChange={this.changeHandler}
                            value={this.state.text}
                        />
                        <h3></h3>
                    </form>
                </div>
                <img src='/images/send.png' onClick={this.handleSubmit} className='sendIcon'/>
            </div>
        );
    }
});

var ChatApp = React.createClass({
    getInitialState() {
        return { 
            user: "", 
            userId: "", 
            users: [], 
            messages: [], 
            text: '', 
            roomId: this.props.roomId,
            roomName: '' // 채팅방 이름 상태 추가
        };
    },
    // 사용자를 목록에 추가하는 함수
    addUserToList(user) {
        const updatedUsers = [...this.state.users, user]; // 기존 사용자 목록에 새로운 사용자 추가
        this.setState({ users: updatedUsers }); // 상태 업데이트
    },

    // 사용자를 목록에서 제거하는 함수
    removeUserFromList(user) {
        const updatedUsers = this.state.users.filter(existingUser => existingUser !== user); // 해당 사용자를 목록에서 제외
        this.setState({ users: updatedUsers }); // 상태 업데이트
    },
    componentDidMount() {
        socket.on('init', this._initialize);
        socket.on('send:message', this._messageRecieve);
        // 사용자가 채팅방에 입장했을 때 서버로부터 받는 이벤트 처리
        this.fetchDBMessages();
        socket.on('get:messages', (messages) => {
            const modifiedMessages = messages.map(message => ({
                user: message.userId,
                text: message.message,
                createdAt: message.createdAt // 생성 시간 추가
            }));
            this.setState(prevState => ({
                messages: [...prevState.messages, ...modifiedMessages]
            }));
        });
        const userId = this.props.userId;
        const username = this.props.user;
        if (username) {
            this.setState({ user: username });
        }
        if (userId) {
            this.setState({ userId: userId });
        }

        this.fetchRoomName(); // 채팅방 이름 가져오기
    },
    fetchRoomName() {
        fetch(`/api/rooms/${this.state.roomId}`)
            .then(response => response.json())
            .then(data => {
                this.setState({ roomName: data.roomname });
            })
            .catch(error => {
                console.error("Error fetching room name:", error);
            });
    },

    scrollToBottom() {
        // 마지막 메시지가 표시되는 부분으로 스크롤 이동
        this.messagesEnd.scrollIntoView({ behavior: "smooth" });
    },

    componentDidUpdate(prevProps, prevState) {
        if (this.state.messages.length !== prevState.messages.length) {
            this.scrollToBottom();
        }
    },

    _initialize(data) {
        var { users, name } = data;
        this.setState({ users, user: name });
    },

    fetchDBMessages() {
        socket.emit('get:messages', this.state.roomId);
    },

    _messageRecieve(message) {
        var { messages } = this.state;
        messages.push(message);
        this.setState({ messages }, this.scrollToBottom); // 새로운 메시지를 받은 후 스크롤
    },

    _userJoined(user) {
        var { users } = this.state;
        users.push(user);
        console.log(user);
        this.setState({ users });
    },

    _userLeft(user) {
        var { users } = this.state;
        var index = users.indexOf(user);
        if (index !== -1) {
            users.splice(index, 1);
            this.setState({ users });
        }
    },

    _updateUsers(users) {
        this.setState({ users });
    },

    handleMessageSubmit(message) {
        var { messages } = this.state;
        messages.push(message);
        this.setState({ messages }, this.scrollToBottom); // 메시지를 보낸 후 스크롤
        socket.emit('send:message', message);
    },

    render() {
        return (
            <div className='center'>
                <div className="group">
                    <span className='backBtn' onClick={this.props.onClickBackBtn}>🔙</span>
                    <h2>{this.state.roomName}</h2> {/* 채팅방 이름 표시 */}
                </div>
                <MessageList     
                    messages={this.state.messages}
                    currentUser={this.state.user}
                />
                <MessageForm
                    onMessageSubmit={this.handleMessageSubmit}
                    user={this.state.user}
                    userId={this.state.userId}
                    roomId={this.state.roomId}
                />
            </div>
        );
    }
});

module.exports = ChatApp;
