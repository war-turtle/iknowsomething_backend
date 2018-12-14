import express from 'express';
import async from 'async';
import jwt from 'jsonwebtoken';
import {
  logger,
} from '../../../log';
import authController from './authController';
import googleAuth from './googleLogin';
import User from '../../models/user';
import config from '../../../config';
import ResponseTemplate from '../../global/templates/response';

const router = express.Router();

router.post('/login', (req, res) => {
  const loginData = req.body;
  const tasks = [

    // Verifying token of the user
    (callback) => {
      googleAuth.verify(loginData, (err, user) => {
        if (err) {
          logger.error(err);
          return callback(err, null);
        }
        return callback(null, user);
      });
    },

    (user, callback) => {
      if (user.email.split('@')[1] !== 'nitkkr.ac.in') {
        return callback('Use NIT KKR domain email only', null);
      }
      return callback(null, user);
    },

    // Checking the user in database amd further processing
    (user, callback) => {
      User.findOne({
        email: user.email,
      }, (err, usr) => {
        if (err) {
          logger.error(err);
          return callback(err, null);
        }
        if (!usr) {
          // eslint-disable-next-line
          user.rollNo = user.email.split('@')[0].split('_')[1];
          authController.createUser(user, (err1, newUser) => {
            if (err1) {
              logger.error(err1);
              return callback(err1, null);
            }
            return callback(null, newUser);
          });
        } else {
          return callback(null, usr);
        }
      });
    },

    // Generating the jwt token
    (user, callback) => {
      // req.session.email = user.email;
      const token = jwt.sign({
        user,
      }, config.app.WEB_TOKEN_SECRET, {
        expiresIn: config.app.jwt_expiry_time,
      });

      return callback(null, token);
    },
  ];

  async.waterfall(tasks, (err, response) => {
    if (err) {
      res.status(401).json(ResponseTemplate.error(401, err));
    } else {
      res.status(200).json(ResponseTemplate.success('successfully logged in', {
        token: response,
      }));
    }
  });
});

export default router;
