import { Game } from './game.js';

const canvas = document.getElementById('game');
const game = new Game(canvas);

// Exposed for debugging / automated capture.
window.__fortArtillery = game;
