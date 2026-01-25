/**
 * @format
 */

// Initialize Sentry as early as possible
import { initSentry } from './src/services/SentryService';
initSentry();

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
