import { Platform } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
/**
 * @format
 */

import './src/app/registerMedia';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

if (Platform.OS === 'android') setBackgroundMessageHandler(getMessaging(), async () => {});
AppRegistry.registerComponent(appName, () => App);
