var React = require('react');
var axios = require('axios');
var NavigationBar = React.createClass({
    render(){
        return(
                <nav className="navbar">
                <img src="./images/friendbtn.png" className='navbar_button' onClick={() => this.setActiveView('friends')}></img>
                <img src="./images/messagebtn.png" className='navbar_button' onClick={this.props.onClickJoinedRoom}></img>
                <img src="./images/chattingbtn.png" className='navbar_button' onClick={this.props.onClickBackBtn}></img>
                </nav>
            )
        }   
    }
)
module.exports = NavigationBar;