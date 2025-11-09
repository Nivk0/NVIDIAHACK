import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './Login.css';

function Login() {
  const { loginWithRedirect, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="login-container">
        <div className="login-content">
          <div className="nvidia-header">
            <div className="nvidia-logo-container">
              <div className="nvidia-logo"></div>
              <span className="nvidia-text">NVIDIA.</span>
              <span className="nvidia-ufm">UFM</span>
            </div>
          </div>
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="nvidia-header">
          <div className="nvidia-logo-container">
            <div className="nvidia-logo"></div>
            <span className="nvidia-text">NVIDIA.</span>
            <span className="nvidia-ufm">UFM</span>
          </div>
        </div>

        <div className="login-form">
          <div className="form-header">
            <h1>Memory Garden <span className="ai-text">AI</span></h1>
            <p>Powered by NVIDIA Nemotron</p>
          </div>

          <div className="form-body">
            <button
              className="login-button primary"
              onClick={() => loginWithRedirect()}
            >
              Login
            </button>

            <div className="or-separator">
              <span className="or-line"></span>
              <span className="or-text">OR</span>
              <span className="or-line"></span>
            </div>

            <button
              className="login-button secondary"
              onClick={() => loginWithRedirect({
                connection: 'microsoft'
              })}
            >
              Sign in with Microsoft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

