/**
 * ⚠️ PENTING: Import initializeBackgroundTask HARUS PERTAMA
 * sebelum import App, supaya TaskManager.defineTask sudah terdaftar
 * saat OS mencoba menjalankan background task
 */
import './initializeBackgroundTask';  // ← TAMBAH INI

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);