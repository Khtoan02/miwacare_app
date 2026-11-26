// Cho phép app import token thiết kế dùng chung ở <repo>/design.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../../design')];

module.exports = config;
