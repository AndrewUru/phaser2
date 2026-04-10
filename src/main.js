import Phaser from 'phaser';
import { createGameConfig } from './game/config/gameConfig.js';
import './styles/main.css';

const config = createGameConfig();

new Phaser.Game(config);
