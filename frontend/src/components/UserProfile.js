import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './UserProfile.css';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

function UserProfile({ onClose }) {
  const { getAccessTokenSilently } = useAuth0();
  const [profile, setProfile] = useState({
    age: '',
    isStudent: false,
    educationLevel: '',
    occupation: '',
    interests: [],
    lifeStage: '',
    location: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      let headers = { 'Content-Type': 'application/json' };
      try {
        const token = await getAccessTokenSilently();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting access token:', error);
      }

      const response = await fetch(`${API_BASE}/profile`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setProfile({
            age: data.age || '',
            isStudent: data.isStudent || false,
            educationLevel: data.educationLevel || '',
            occupation: data.occupation || '',
            interests: data.interests || [],
            lifeStage: data.lifeStage || '',
            location: data.location || '',
            notes: data.notes || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInterestChange = (interest, checked) => {
    setProfile(prev => {
      const interests = checked
        ? [...prev.interests, interest]
        : prev.interests.filter(i => i !== interest);
      return { ...prev, interests };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      let headers = { 'Content-Type': 'application/json' };
      try {
        const token = await getAccessTokenSilently();
        headers['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Error getting access token:', error);
      }

      const response = await fetch(`${API_BASE}/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profile),
      });

      if (response.ok) {
        setMessage('Profile saved successfully! This information will be used to better analyze your memories.');
        setTimeout(() => {
          setMessage('');
          if (onClose) onClose();
        }, 2000);
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage('Error saving profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const commonInterests = [
    'Technology', 'Art', 'Music', 'Sports', 'Travel', 'Reading', 
    'Cooking', 'Photography', 'Gaming', 'Fitness', 'Education', 
    'Business', 'Science', 'Writing', 'Movies', 'Nature'
  ];

  if (loading) {
    return (
      <div className="user-profile-panel">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="user-profile-panel">
      <div className="profile-header">
        <h2>👤 User Profile</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="profile-content">
        <p className="profile-description">
          Help us understand your context to better analyze memory relevance. 
          This information is used to personalize AI predictions.
        </p>

        {message && (
          <div className={`profile-message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="profile-section">
          <h3>Basic Information</h3>
          
          <div className="form-group">
            <label htmlFor="age">Age</label>
            <input
              type="number"
              id="age"
              min="1"
              max="120"
              value={profile.age}
              onChange={(e) => handleChange('age', e.target.value)}
              placeholder="Enter your age"
            />
          </div>

          <div className="form-group">
            <label htmlFor="lifeStage">Life Stage</label>
            <select
              id="lifeStage"
              value={profile.lifeStage}
              onChange={(e) => handleChange('lifeStage', e.target.value)}
            >
              <option value="">Select life stage</option>
              <option value="student">Student</option>
              <option value="young-professional">Young Professional</option>
              <option value="mid-career">Mid-Career Professional</option>
              <option value="senior-professional">Senior Professional</option>
              <option value="retired">Retired</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              value={profile.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="City, Country (optional)"
            />
          </div>
        </div>

        <div className="profile-section">
          <h3>Education & Career</h3>
          
          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={profile.isStudent}
                onChange={(e) => handleChange('isStudent', e.target.checked)}
              />
              <span>Currently a student</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="educationLevel">Education Level</label>
            <select
              id="educationLevel"
              value={profile.educationLevel}
              onChange={(e) => handleChange('educationLevel', e.target.value)}
            >
              <option value="">Select education level</option>
              <option value="high-school">High School</option>
              <option value="some-college">Some College</option>
              <option value="bachelors">Bachelor's Degree</option>
              <option value="masters">Master's Degree</option>
              <option value="phd">PhD/Doctorate</option>
              <option value="professional">Professional Certification</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="occupation">Occupation / Field</label>
            <input
              type="text"
              id="occupation"
              value={profile.occupation}
              onChange={(e) => handleChange('occupation', e.target.value)}
              placeholder="e.g., Software Engineer, Teacher, Student, etc."
            />
          </div>
        </div>

        <div className="profile-section">
          <h3>Interests & Activities</h3>
          <p className="section-description">Select your main interests (helps determine memory relevance)</p>
          
          <div className="interests-grid">
            {commonInterests.map(interest => (
              <label key={interest} className="interest-checkbox">
                <input
                  type="checkbox"
                  checked={profile.interests.includes(interest)}
                  onChange={(e) => handleInterestChange(interest, e.target.checked)}
                />
                <span>{interest}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="profile-section">
          <h3>Additional Context</h3>
          <div className="form-group">
            <label htmlFor="notes">Additional Notes</label>
            <textarea
              id="notes"
              value={profile.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Any additional context that might help analyze your memories (e.g., 'I'm working on a research project', 'I travel frequently for work', etc.)"
              rows="4"
            />
          </div>
        </div>

        <div className="profile-actions">
          <button
            className="save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
          <button
            className="cancel-button"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
        </div>

        <div className="profile-info">
          <p>ℹ️ Your profile information is stored locally and used to personalize memory analysis. 
          It helps the AI understand what types of memories are most relevant to you.</p>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;

