var React = require('react');
var axios = require('axios');
var NavigationBar = require('./navigation.jsx');
var { SearchChat, ChatRoomList } = require('./chattingroom.jsx');

var ChatRoomListAndSearchPage = React.createClass({
    getInitialState() {
        return {
            searchText: ''
        };
    },

    handleSearchChange(searchText) {
        this.setState({ searchText });
    },
    handleCreate(e) {
        axios.post('/api/rooms/create', {
            roomname: this.state.searchText
        })
        .then(response => {
            console.log(response);
            alert('채팅방이 개설되었습니다.');
            // 생성된 새로운 채팅방으로 즉시 이동
            this.props.onRoomSelect(response.data.roomId);
            this.setState({ searchText: '' });
        })
        .catch(error => {
            console.error('Error:', error);
        });
    },

    render() {
        return (
            <div className="container">
                <h2>채팅방 검색</h2>
                <div className="search-container">
                    <SearchChat onSearchChange={this.handleSearchChange} />
                    <button className='addBtn' onClick={this.handleCreate}>생성</button>
                </div>
                <div className="room-list-container">
                    <ChatRoomList 
                        searchText={this.state.searchText} 
                        onRoomSelect={this.props.onRoomSelect}
                    />
                </div>
                <NavigationBar onClickJoinedRoom={this.props.onClickJoinedRoom} onClickBackBtn={this.props.onClickBackBtn}></NavigationBar>
            </div>
        );
    }
});

module.exports = ChatRoomListAndSearchPage;