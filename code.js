let hydra, hydraCanvas;
hydraCanvas = document.getElementById("hydraCanvas");
hydraCanvas.length = window.innerLength;
hydraCanvas.height = window.innerHeight;
console.log(hydraCanvas)

hydra = new Hydra({
  canvas: hydraCanvas,
  detectAudio: true,
  enableStreamCapture: false,
  width: hydraCanvas.width,
  height: hydraCanvas.height,
});

a.setBins(10);

a.setSmooth(0.95)

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

effect_sources = Array(15).fill(0);
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

try {
	clearInterval(interval);
} catch (error) {}

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

function cadj(f, m, c) {
	function inner() {
		return f() * m + c;
	}
	return inner;
}

red = [
	(chain, x) => chain.rotate(x),
	(chain, x) => chain.pixelate(cadj(x, 512, 32), cadj(x, 512, 32)),
	(chain, x) => chain.scrollX(cmul(x, 10)),
	(chain, x) => chain.scrollY(cmul(x, 10)),
	(chain, x) => chain.kaleid(cmul(x, 10))
]

green = [
	(chain, x) => chain.colorama(x),
	(chain, x) => chain.luma(x),
	(chain, x) => chain.thresh(x),
	(chain, x) => chain.hue(x),
	(chain, x) => chain.saturate(x),
]


blue = [
	(chain, x) => (chain.modulate(src(o0), x)),
	(chain, x) => (chain.modulateScale(src(o0), x)),
	(chain, x) => (chain.modulateKaleid(src(o0), x)),	
	(chain, x) => (chain.sub(src(o0), x)),
	(chain, x) => (chain.mult(src(o0), x))	
]

s0.clear();
s0.initCam();
const interval = setInterval(function() {
	if (JSON.stringify(last_effect_sources) != JSON.stringify(effect_sources)) {
      console.log("clear")
      used_buffers = [false, false, false]

      	// s1.clear();
      	// s2.clear();
      	// s3.clear();
		// rebuild signal chain
		chain = src(s0);
		
		for (let i = 0; i < 5; i++) {
			if (effect_sources[i].length > 0) {
				// feedback modulation effect
				x = calculate_input(effect_sources[i])
				chain = red[i](chain, x)
			}
			if (effect_sources[i + 5].length > 0) {
				// feedback modulation effect
				x = calculate_input(effect_sources[i + 5])
				chain = green[i](chain, x)
				//chain = chain.pixelate(n, n);
			}
			if (effect_sources[i + 10].length > 0) {
				//b = src(o0);
				x = calculate_input(effect_sources[i + 10])
				chain = blue[i](chain, x)
				// feedback modulation effect
				//chain = chain.colorama(calculate_input(effect_sources[i + 10]));
			}
		}
		chain.out(o0);
		
		
	}
	last_effect_sources = JSON.parse(JSON.stringify(effect_sources));
 }, 250);
 
 render(o0);
 