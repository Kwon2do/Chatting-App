'use strict';
var React = require('react');
var axios = require('axios');

var Signup = React.createClass({
    getInitialState() {
        return { name: '', password: '', alertMessage: '' };
    },

    onChange(e) {
        this.setState({ [e.target.name]: e.target.value });
    },

    handleSubmit(e) {
        e.preventDefault();

        // 입력 체크
        if (!this.state.name || !this.state.password) {
            this.setState({ alertMessage: '아이디/비밀번호를 필수로 입력하셔야합니다.' });
            return;
        }

        // 회원가입 정보를 서버로 전송
        axios.post('/api/sign-up', {
            userId: this.state.name,
            password: this.state.password
        })
        .then(response => {
            // 서버로부터의 응답을 처리
            console.log(response.data); // 서버에서 받은 데이터
            this.props.onSignup(this.state.name);
            alert('회원가입이 완료되었습니다.');
            setTimeout(() => {
                window.location.reload(); // 페이지 새로고침
            }, 500); // 0.5초지연을 주어 alert가 먼저 실행되도록 함
        })
        .catch(error => {
            // 오류 처리
            console.error('Error:', error);
            if (error.response && error.response.status === 409) {
                this.setState({ alertMessage: '⚠️이미 존재하는 아이디입니다.' });
            }
        });
    },

    handleLogin(e) {
        e.preventDefault();

        // 입력 체크
        if (!this.state.name || !this.state.password) {
            this.setState({ alertMessage: '⚠️ID/PW를 입력해야합니다.' });
            return;
        }

        // 로그인 정보를 서버로 전송
        axios.get('/api/sign-in', {
            params: {
                userId: this.state.name,
                password: this.state.password
            }
        })
        .then(response => {
            // 서버로부터의 응답을 처리
            console.log(response.data.id); // 서버에서 받은 데이터
            if (response.status === 200) {
                // 로그인 성공 시 다음 작업 수행
                this.props.onSignin(this.state.name, response.data.id);
            } else {
                // 로그인 실패 시 오류 메시지 표시
                alert("⚠️로그인 정보를 확인해주세요");
                console.error('로그인 실패:', response.data);
            }
        })
        .catch(error => {
            // 오류 처리
            console.error('Error:', error);
            this.setState({ alertMessage: '⚠️ID/PW를 확인해주세요.' });
        });
    },

    render() {
        return (
            <div className='signup-container'>
                <img className="logo" src="/images/chatlogo.png"/>
                <h2>Chatting</h2>
                {this.state.alertMessage && <div className='alert-message'>{this.state.alertMessage}</div>}
                <form className='signup-form' onSubmit={this.handleSubmit}>
                    <div className='input-container'>
                        <img src="/images/id.png" alt="ID icon" className='input-icon'/>
                        <input
                            className='input-field'
                            type="text"
                            name="name"
                            placeholder='ID'
                            onChange={this.onChange}
                            value={this.state.name}
                            style={{fontSize:"8px"}}
                        />
                    </div>
                    <div className='input-container'>
                        <img src="/images/pw.png" alt="Password icon" className='input-icon'/>
                        <input
                            className='input-field'
                            type="password"
                            name="password"
                            placeholder='PASSWORD'
                            onChange={this.onChange}
                            value={this.state.password}
                            style={{fontSize:"8px"}}
                        />
                    </div>
                    
                <button className='login-button' onClick={this.handleLogin} type="submit">Login</button>
                </form>
                <button className='signup-button' type="submit" onClick={this.handleSubmit}>Sign Up</button>
            </div>
        );
    }
});

module.exports = Signup;
