import React, { useState, useEffect } from 'react';
import { authAPI } from '../utils/api';

// Simple in-memory cache for user names
const userCache = {};

const UserDisplay = ({ userId }) => {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    if (userId) {
      // Check cache first
      if (userCache[userId]) {
        setUserName(userCache[userId]);
        return;
      }

      // If not in cache, fetch from API
      authAPI.getMe(userId)
        .then(data => {
          const name = data.username || 'Unknown User';
          setUserName(name);
          userCache[userId] = name; // Store in cache
        })
        .catch(err => {
          console.error(`Failed to fetch user ${userId}`, err);
          setUserName('Unknown User');
        });
    }
  }, [userId]);

  return <p>{userName}</p>;
};

export default UserDisplay;
