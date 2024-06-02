var React = require('react');
var axios = require('axios');
var NavigationBar = require('./navigation.jsx');
var { SearchChat } = require('./chattingroom.jsx');

var JoinedChattingRoom = React.createClass({
    getInitialState() {
        return {
            chatRooms: [],
            searchText: ''
        };
    },

    handleSearchChange(searchText) {
        this.setState({ searchText });
    },

    componentDidMount() {
        this.fetchChatRooms();
    },

    fetchChatRooms() {
        axios.get(`/api/joined-roomlist/${this.props.userId}`)
            .then(response => {
                this.setState({ chatRooms: response.data });
                console.log(this.state.chatRooms);
            })
            .catch(error => {
                console.error('Error fetching chat rooms:', error);
            });
    },

    handleRoomClick(roomId) {
        sessionStorage.setItem("roomId", roomId);
        console.log(roomId);
    },

    render() {
        const filteredRooms = this.state.chatRooms.filter(room => 
            room.roomname.toLowerCase().includes(this.state.searchText.toLowerCase())
        );

        return (
            <div>
                <h2>참여 중인 채팅방 목록</h2>
                <div className="search-container">
                    <SearchChat onSearchChange={this.handleSearchChange} />
                </div>
                <span className='joinedlist'>
                    {filteredRooms.map(room => (
                        <span
                            className="chatlist" 
                            key={room.roomId} 
                            onClick={() => {
                                this.handleRoomClick(room.roomId);
                                this.props.onRoomSelect(room.roomId);
                            }}
                        >
                            {room.roomname}
                        </span>
                    ))}
                </span>
                <NavigationBar onClickBackBtn={this.props.onClickBackBtn}/>
            </div>
        );
    }
});

module.exports = JoinedChattingRoom;
