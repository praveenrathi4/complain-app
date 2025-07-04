import React, { useState, useEffect } from 'react';

const API_URL = 'https://complain-app-backend.onrender.com/api'; // Confirmed correct backend URL

function App() {
  const [view, setView] = useState('login');
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [phoneVerificationSent, setPhoneVerificationSent] = useState(false);

  // Fetch complaints after login
  useEffect(() => {
    if (token && view === 'dashboard') {
      fetch(`${API_URL}/complaints`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) setComplaints(data.data.complaints);
        });
    }
  }, [token, view]);

  // Handle input changes
  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Login
  const handleLogin = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password })
      });
      const data = await res.json();
      if (data.success) {
        setToken(data.data.token);
        setUser(data.data.user);
        setView('dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  // Register
  const handleRegister = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.needsVerification) {
          setVerificationEmail(data.email);
          // Send phone verification first
          await handleSendPhoneVerification();
        } else {
          alert('Registration successful! Please check your email for verification.');
          setView('login');
        }
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Network error');
    }
    setLoading(false);
  };

  // New complaint
  const handleNewComplaint = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category || 'other',
          priority: form.priority || 'medium'
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Complaint submitted!');
        setView('dashboard');
        setForm({});
        // Refresh complaints
        fetch(`${API_URL}/complaints`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) setComplaints(data.data.complaints);
          });
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  // Logout
  const handleLogout = () => {
    setToken('');
    setUser(null);
    setView('login');
    setForm({});
    setComplaints([]);
  };

  // Verify email
  const handleVerifyEmail = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: verificationEmail, 
          verificationToken: form.verificationToken 
        })
      });
      const data = await res.json();
      if (data.success) {
        setError('');
        setVerificationEmail('');
        setForm({}); // Clear the form
        // Registration complete, user is automatically logged in
        setToken(data.data.token);
        setUser(data.data.user);
        setView('dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Network error');
    }
    setLoading(false);
  };

  // Send phone verification code
  const handleSendPhoneVerification = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/send-phone-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: form.phone,
          name: form.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setPhoneVerificationSent(true);
        setError('Phone verification code sent to your WhatsApp!');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Network error');
    }
    setLoading(false);
  };

  // Verify phone number
  const handleVerifyPhone = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/verify-phone-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: verificationEmail,
          phone: form.phone,
          verificationCode: form.phoneVerificationCode
        })
      });
      const data = await res.json();
      if (data.success) {
        setError('');
        setPhoneVerificationSent(false);
        // Continue with email verification
        setView('verification');
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Network error');
    }
    setLoading(false);
  };

  // UI
  if (view === 'login') {
    return (
      <div>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input name="email" type="email" placeholder="Email" onChange={handleChange} required /><br />
          <input name="password" type="password" placeholder="Password" onChange={handleChange} required /><br />
          <button type="submit" disabled={loading}>Login</button>
        </form>
        <button onClick={() => setView('register')}>Register</button>
        {error && <div style={{color:'red'}}>{error}</div>}
      </div>
    );
  }

  if (view === 'verification') {
    return (
      <div>
        <h2>Complete Registration</h2>
        <p>Please check your email and enter the verification code to complete your registration.</p>
        <form onSubmit={handleVerifyEmail}>
          <input
            type="text"
            placeholder="Verification Code"
            value={form.verificationToken || ''}
            onChange={e => setForm({...form, verificationToken: e.target.value})}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Complete Registration'}
          </button>
        </form>
        <button onClick={() => {setView('login');}}>
          Back to Login
        </button>
        {error && <div style={{color:'red'}}>{error}</div>}
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div>
        <h2>Register</h2>
        {!phoneVerificationSent ? (
          <form onSubmit={handleRegister}>
            <input name="name" placeholder="Name" onChange={handleChange} required /><br />
            <input name="email" type="email" placeholder="Email" onChange={handleChange} required /><br />
            <input name="phone" placeholder="Phone (with country code)" onChange={handleChange} required /><br />
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required /><br />
            <button type="submit" disabled={loading}>Register</button>
          </form>
        ) : (
          <div>
            <h3>Verify Phone Number</h3>
            <p>We've sent a verification code to your WhatsApp number: {form.phone}</p>
            <form onSubmit={handleVerifyPhone}>
              <input
                name="phoneVerificationCode"
                placeholder="Enter 6-digit code from WhatsApp"
                onChange={handleChange}
                maxLength="6"
                required
              /><br />
              <button type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Phone'}
              </button>
            </form>
            <button onClick={handleSendPhoneVerification} disabled={loading}>
              Resend Code
            </button>
            <button onClick={() => {setPhoneVerificationSent(false); setError('');}}>
              Back to Registration
            </button>
          </div>
        )}
        <button onClick={() => setView('login')}>Back to Login</button>
        {error && <div style={{color:'red'}}>{error}</div>}
      </div>
    );
  }

  if (view === 'dashboard') {
    return (
      <div>
        <h2>Welcome, {user?.name || 'User'}</h2>
        <button onClick={handleLogout}>Logout</button>
        <h3>My Complaints</h3>
        <button onClick={() => setView('newComplaint')}>New Complaint</button>
        <ul>
          {complaints.map(c => (
            <li key={c._id}>
              <b>{c.title}</b> - {c.status} <br />
              <small>{c.description}</small>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (view === 'newComplaint') {
    return (
      <div>
        <h2>New Complaint</h2>
        <form onSubmit={handleNewComplaint}>
          <input name="title" placeholder="Title" onChange={handleChange} required /><br />
          <textarea name="description" placeholder="Description" onChange={handleChange} required /><br />
          <select name="category" onChange={handleChange} defaultValue="other">
            <option value="product_quality">Product Quality</option>
            <option value="service_issue">Service Issue</option>
            <option value="delivery_problem">Delivery Problem</option>
            <option value="billing_issue">Billing Issue</option>
            <option value="technical_support">Technical Support</option>
            <option value="customer_service">Customer Service</option>
            <option value="warranty_claim">Warranty Claim</option>
            <option value="other">Other</option>
          </select><br />
          <select name="priority" onChange={handleChange} defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select><br />
          <button type="submit" disabled={loading}>Submit</button>
        </form>
        <button onClick={() => setView('dashboard')}>Back to Dashboard</button>
        {error && <div style={{color:'red'}}>{error}</div>}
      </div>
    );
  }

  return null;
}

export default App;
