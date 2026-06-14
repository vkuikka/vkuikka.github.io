const $ = (id) => document.getElementById(id);
const drop = $('drop'), fileInput = $('file'), editor = $('editor');
const fname = $('fname'), meta = $('meta');
const canvas = $('wave'), waveWrap = $('waveWrap');
const hStart = $('hStart'), hEnd = $('hEnd'), playhead = $('playhead');
const ruler = $('ruler');
const startInput = $('startInput'), endInput = $('endInput');
const startVal = $('startVal'), endVal = $('endVal');
const fadeIn = $('fadeIn'), fadeOut = $('fadeOut');
const fadeInVal = $('fadeInVal'), fadeOutVal = $('fadeOutVal');
const toast = $('toast');

const ctx = canvas.getContext('2d');

let audioCtx = null;
let buffer = null;
let fileName = 'audio';
let selStart = 0, selEnd = 0;
let viewStart = 0, viewEnd = 0;
let fadeInDur = 0, fadeOutDur = 0;
let curve = 'linear';
let format = 'wav';

const fx = {
  reverbMix: 0,
  reverbDecay: 2.0,
  reverbPredelay: 0,
  echoMix: 0,
  echoTime: 0.25,
  echoFeedback: 0.3,
  tone: 20000,
  highpass: 0,
  outGainDb: 0,
};
let effectsEnabled = true;
let channelMode = 'stereo';

let bpm = 120;
let snapEnabled = false;
let snapDivision = 4;
let snapOffset = 0;
let loopTunerEnabled = false;
let leftView = { start: 0, end: 1 };
let rightView = { start: 0, end: 1 };
let tunerDrag = null;
let crossfadeSec = 0;
let crossfadeCurve = 'equal';
let playSrcStartT = 0;
let playSrcEndT = 0;
let playOrigStartT = 0;
let playOffsetSrc = 0;
let crossfadeRestartTimer = null;

const PRESETS = {
  dry:       { reverbMix: 0.00, reverbDecay: 2.0, reverbPredelay: 0.000, echoMix: 0.00, echoTime: 0.250, echoFeedback: 0.30, tone: 20000, highpass:   0, outGainDb:  0 },
  small:     { reverbMix: 0.25, reverbDecay: 0.6, reverbPredelay: 0.005, echoMix: 0.00, echoTime: 0.080, echoFeedback: 0.10, tone: 14000, highpass:   0, outGainDb:  0 },
  cave:      { reverbMix: 0.55, reverbDecay: 3.2, reverbPredelay: 0.030, echoMix: 0.40, echoTime: 0.280, echoFeedback: 0.50, tone:  3800, highpass:  80, outGainDb: -3 },
  cathedral: { reverbMix: 0.60, reverbDecay: 6.0, reverbPredelay: 0.060, echoMix: 0.15, echoTime: 0.400, echoFeedback: 0.30, tone:  5500, highpass:  40, outGainDb: -2 },
  distant:   { reverbMix: 0.65, reverbDecay: 2.5, reverbPredelay: 0.045, echoMix: 0.30, echoTime: 0.220, echoFeedback: 0.40, tone:  2200, highpass: 220, outGainDb: -4 },
};

let currentSource = null;
let currentGain = null;
let currentGraph = null;
let currentLooping = false;
let playStartAudioTime = 0;
let playStartOffset = 0;
let playEndOffset = 0;
let playFirstIterRemain = 0;
let rafId = null;

const CUSTOM_KEY = 'audioPickerCustomPresets';
const FX_KEYS = ['reverbMix','reverbDecay','reverbPredelay','echoMix','echoTime','echoFeedback','tone','highpass','outGainDb'];
