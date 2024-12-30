let hydra, hydraCanvas;
hydraCanvas = document.getElementById("hydraCanvas");
hydraCanvas.length = 1920;//window.innerLength;
hydraCanvas.height = 1080;//window.innerHeight;
console.log(hydraCanvas)

hydra = new Hydra({
  canvas: hydraCanvas,
  detectAudio: true,
  enableStreamCapture: false,
  width: hydraCanvas.width,
  height: hydraCanvas.height,
});

a.setBins(5);
a.setSmooth(0);

function onMIDISuccess(midiAccess) {
    console.log(midiAccess);
    var inputs = midiAccess.inputs;
    var outputs = midiAccess.outputs;
    for (var input of midiAccess.inputs.values()){
        input.onmidimessage = getMIDIMessage;
    }
}

/// register WebMIDI
navigator.requestMIDIAccess()
    .then(onMIDISuccess, onMIDIFailure);

function onMIDIFailure() {
    console.log('Could not access your MIDI devices.');
}

getMIDIMessage = function(midiMessage) {
    var source = midiMessage.data[1]  
	var dest = midiMessage.data[2]
	if (midiMessage.data[0] == 0x90) {
		if (!effect_sources[dest].includes(source)) {
			effect_sources[dest].push(source);
		}
	} else if (midiMessage.data[0] == 0x80) {
		effect_sources[dest] = effect_sources[dest].filter((x) => x !== source)
	}
}

effect_sources = Array(20).fill(0);
effect_sources = effect_sources.map((x) => [])

last_effect_sources = effect_sources;


used_buffers = [false, false, false]
function getFreeBuffer() {
	for (let i = 0; i < used_buffers.length; i++) {
		if (!used_buffers) {
			return [s1, s2, s3][i];
		}
	}
	return -1;
}

function sum(arr) {
	return arr.reduce((a, b) => {
		return a + b;
	}, 0)
}

function calculate_input(sources, scale=1) {
	function inner() {
		total = 0;
		for (let source of sources) {
			total += a.fft[source];
		}
		return total * scale;
	}
	return inner;
}

function cadj(f, m=1, c=0) {
	function inner() {
		return f() * m + c;
	}
	return inner;
}

red = [
	(chain, x) => chain.rotate(x),
	(chain, x) => chain.pixelate(cadj(x, 512, 32), cadj(x, 512, 32)),
        (chain, x) => chain.scrollX(cadj(x, 10)),
	(chain, x) => chain.scrollY(cadj(x, 10)),
	(chain, x) => chain.kaleid(cadj(x, 100))
]

green = [
    (chain, x) => chain.colorama(cadj(x, 5)),
    (chain, x) => chain.luma(x),
    (chain, x) => chain.colorama(cadj(x, 5)),
    (chain, x) => chain.hue(cadj(x, 15)),
    (chain, x) => chain.colorama(cadj(x, 5)),
]


blue = [
    (chain, x) => (chain.modulate(src(o0), x)),
    (chain, x) => (chain.modulateScale(src(o0), cadj(x, 5))),
    (chain, x) => (chain.modulate(src(o0), cadj(x, 5))),	
    (chain, x) => chain.modulate(src(o0), x),
    (chain, x) => chain.modulate(src(o0), x),
]

s1.clear()
s1.initScreen();


black = [
    (chain, x) => (chain.modulate(src(s1), x)),
    (chain, x) => (chain.modulateScale(src(s1), cadj(x, 5))),
    (chain, x) => (chain.modulate(src(s1), cadj(x, 5))),	
    (chain, x) => chain.modulate(src(s1), x),
    (chain, x) => chain.modulate(src(s1), x),
]



try {
	clearInterval(interval);
} catch (error) {}

s0.clear();
s0.initCam();
const interval = setInterval(function() {
    if (JSON.stringify(last_effect_sources) != JSON.stringify(effect_sources)) {
	// rebuild signal chain
	chain = src(s0);
		
	for (let i = 0; i < 5; i++) {
	    if (effect_sources[i].length > 0) {
		x = calculate_input(effect_sources[i])
		chain = red[i](chain, x)
	    }
	    if (effect_sources[i + 5].length > 0) {
		x = calculate_input(effect_sources[i + 5])
		chain = green[i](chain, x)
	    }
	    if (effect_sources[i + 10].length > 0) {
		x = calculate_input(effect_sources[i + 10])
		chain = blue[i](chain, x)
	    }
	    if (effect_sources[i + 15].length > 0) {
		x = calculate_input(effect_sources[i + 15])
		chain = black[i](chain, x)
	    }
	}
	chain.out(o0);
    }
    
    last_effect_sources = JSON.parse(JSON.stringify(effect_sources));
 }, 250);
 
 render(o0);
 
