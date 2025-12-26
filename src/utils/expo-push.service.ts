// src/utils/expo-push.service.ts
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import pool from '../config/database';

const expo = new Expo();

interface SendPushParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function sendPushNotificationToUser(params: SendPushParams) {
  const { userId, title, body, data } = params;

  try {
    const result = await pool.query(
      'SELECT fcm_token FROM users WHERE id = $1 AND fcm_token IS NOT NULL',
      [userId]
    );

    const expoPushToken = result.rows[0]?.fcm_token;

    if (!expoPushToken) {
      console.log(`No push token found for user ${userId}`);
      return null;
    }

    if (!Expo.isExpoPushToken(expoPushToken)) {
      console.error(`Invalid Expo push token: ${expoPushToken}`);
      return null;
    }

    const message: ExpoPushMessage = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high',
      channelId: 'default',
    };

    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    console.log(`✅ Push notification sent to user ${userId}`);
    return ticketChunk[0];
  } catch (error) {
    console.error('Error sending push notification:', error);
    return null;
  }
}