const activeNotes = new Set();
let phi = 0;
let velocity = 0.005;

function drawParametricCurve(svg, funcX, funcY, tMin, tMax, steps, scaleX, scaleY, translateX, translateY) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    let d = "";
    if (activeNotes.size === 0) return;
    for (let i = 0; i <= steps; i++) {
        const t = tMin + (tMax - tMin) * (i / steps);
        const x = funcX(t) * scaleX + translateX;
        const y = funcY(t) * scaleY * -1 + translateY;
        if (i === 0) {
            d += `M ${x} ${y}`;
        } else {
            d += ` L ${x} ${y}`;
        }
        // a simple curve to connect the points instead of straight lines
    }

    path.setAttribute("d", d);
    path.setAttribute("stroke", "#fff");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    svg.appendChild(path);
}

function drawParametricCurveTop(svg, funcX, funcY, tMin, tMax, steps, scaleX, scaleY, translateX, translateY) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    let d = "";
    if (activeNotes.size === 0) return;
    for (let i = 0; i <= steps; i++) {
        const t = tMin + (tMax - tMin) * (i / steps);
        const x = funcX(t) * scaleX + translateX;
        const y = funcY(t) * scaleY * -1 + translateY;
        if (i === 0) {
            d += `M ${x} ${y}`;
        } else {
            d += ` L ${x} ${y}`;
        }
    }

    path.setAttribute("d", d);
    path.setAttribute("stroke", "#fff");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("fill", "none");
    svg.appendChild(path);
}

function getJustIntonationInterval(note) {
    const justIntonationRatios = {
        'C': 1, 'C#': 16 / 15, 'D': 9 / 8, 'D#': 6 / 5, 'E': 5 / 4,
        'F': 4 / 3, 'F#': 45 / 32, 'G': 3 / 2, 'G#': 8 / 5, 'A': 5 / 3,
        'A#': 9 / 5, 'B': 15 / 8
    };
    return justIntonationRatios[note] || 1;
}

function getBIntervals(note) {
    const bIntervals = {
        'C': 1, 'C#': 15, 'D': 8, 'D#': 5, 'E': 4,
        'F': 3, 'F#': 32, 'G': 2, 'G#': 5, 'A': 3,
        'A#': 5, 'B': 8
    };
    return bIntervals[note] || 1;
}

function getNoteFromMIDINumber(noteNumber) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    return notes[noteNumber % 12];
}

function getOctaveFromMIDINumber(noteNumber) {
    return Math.floor(noteNumber / 12) - 1;
}

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function lcm(a, b) {
    return (a * b) / gcd(a, b);
}

function lcmOfArray(arr) {
    return arr.reduce((acc, val) => lcm(acc, val), 1);
}


function updateActiveIntervals() {
    const intervalsDiv = document.getElementById("equationDisplay");

    const justIntonationRatios = {
        'C': { num: 1, den: 1 },
        'C#': { num: 16, den: 15 },
        'D': { num: 9, den: 8 },
        'D#': { num: 6, den: 5 },
        'E': { num: 5, den: 4 },
        'F': { num: 4, den: 3 },
        'F#': { num: 45, den: 32 },
        'G': { num: 3, den: 2 },
        'G#': { num: 8, den: 5 },
        'A': { num: 5, den: 3 },
        'A#': { num: 9, den: 5 },
        'B': { num: 15, den: 8 }
    };

    const intervals = Array.from(activeNotes).map(noteNumber => {
        const note = getNoteFromMIDINumber(noteNumber);
        let { num, den } = justIntonationRatios[note] || { num: 1, den: 1 };
        const octave = getOctaveFromMIDINumber(noteNumber);

        if (octave > 4) {
            num *= Math.pow(2, octave - 4);
        } else if (octave < 4) {
            den *= Math.pow(2, 4 - octave);
        }

        return { num, den };
    });

    if (intervals.length === 0) {
        intervalsDiv.innerHTML = "";
        return;
    }

    const fractionStrings = intervals.map(({ num, den }) => {
        const gcdValue = gcd(num, den);
        const simplifiedNumerator = num / gcdValue;
        const simplifiedDenominator = den / gcdValue;
        return `sin(${simplifiedNumerator}/${simplifiedDenominator} * t)`;
    });

    intervalsDiv.innerHTML = `(${fractionStrings.join(" + ")} , cos(t))`;
}


// This function is modified to call the interval update whenever active notes change
function onMIDIMessage(event) {
    const command = event.data[0];
    const noteNumber = event.data[1];
    const velocity = event.data[2];

    const noteOnCommand = 0x90;
    const noteOffCommand = 0x80;

    if (command >= noteOnCommand && command < noteOnCommand + 16 && velocity > 0) {
        activeNotes.add(noteNumber);
    } 

    else if (
        (command >= noteOffCommand && command < noteOffCommand + 16) || 
        (command >= noteOnCommand && command < noteOnCommand + 16 && velocity === 0)
    ) {
        activeNotes.delete(noteNumber);
    }

    // After updating the active notes, call the function to update intervals
    updateActiveIntervals();

    console.log(`Active Notes: ${Array.from(activeNotes)}`);
}

function animate() {
    phi += velocity;
    if (phi > 2 * Math.PI) {
        phi -= 2 * Math.PI;
    }

    const svgCanvas = document.getElementById("svgCanvas");
    svgCanvas.innerHTML = '';

    const canvasWidth = svgCanvas.clientWidth;
    const canvasHeight = svgCanvas.clientHeight;

    const intervals = Array.from(activeNotes).map(noteNumber => {
        const note = getNoteFromMIDINumber(noteNumber);
        const interval = getJustIntonationInterval(note);
        const octave = getOctaveFromMIDINumber(noteNumber);
        if (octave > 4) {
            return interval * Math.pow(2, octave - 4);
        } else if (octave < 4) {
            return interval / Math.pow(2, 4 - octave);
        } else {
            return interval;
        }
    });

    const bIntervals = Array.from(activeNotes).map(noteNumber => {
        const note = getNoteFromMIDINumber(noteNumber);
        const octave = getOctaveFromMIDINumber(noteNumber);
        let bInterval = getBIntervals(note);
        if (octave > 4) {
            bInterval *= Math.pow(2, octave - 4);
        } else if (octave < 4) {
            bInterval *= Math.pow(2, 4 - octave);
        }
        return bInterval;
    });
    const bInterval = bIntervals.length > 0 ? lcmOfArray(bIntervals) : 1;
    const B = activeNotes.size;

    drawParametricCurve(svgCanvas,
        t => intervals.reduce((sum, interval) => sum + Math.sin(interval * t + phi), 0),
        t => B * Math.cos(t),
        0, 2 * bInterval * Math.PI, 1000,
        200 / B, 200 / B, canvasWidth / 2, canvasHeight / 2);

    requestAnimationFrame(animate);
}

// Add this call to also update the intervals when animation starts
requestAnimationFrame(animate);


function animateTop() {
    phi += velocity;
    if (phi > 2 * Math.PI) {
        phi -= 2 * Math.PI;
    }

    const svgCanvas = document.getElementById("svgCanvas2");
    svgCanvas.innerHTML = '';

    const canvasWidth = svgCanvas.clientWidth;
    const canvasHeight = svgCanvas.clientHeight;

    const intervals = Array.from(activeNotes).map(noteNumber => {
        const note = getNoteFromMIDINumber(noteNumber);
        const interval = getJustIntonationInterval(note);
        const octave = getOctaveFromMIDINumber(noteNumber);
        if (octave > 4) {
            return interval * Math.pow(2, octave - 4);
        } else if (octave < 4) {
            return interval / Math.pow(2, 4 - octave);
        } else {
            return interval;
        }
    });

    const bIntervals = Array.from(activeNotes).map(noteNumber => {
        const note = getNoteFromMIDINumber(noteNumber);
        const octave = getOctaveFromMIDINumber(noteNumber);
        let bInterval = getBIntervals(note);
        if (octave > 4) {
            bInterval *= Math.pow(2, octave - 4);
        } else if (octave < 4) {
            bInterval *= Math.pow(2, 4 - octave);
        }
        return bInterval;
    });
    const bInterval = bIntervals.length > 0 ? lcmOfArray(bIntervals) : 1;
    const B = activeNotes.size;

    drawParametricCurve(svgCanvas,
        t => intervals.reduce((sum, interval) => sum + Math.sin(interval * t), 0),
        t => intervals.reduce((sum, interval) => sum + Math.cos(interval * t), 0),
        0, 2 * bInterval * Math.PI, 5000,
        200 / B, 200 / B, canvasWidth / 2, canvasHeight / 2);

    requestAnimationFrame(animateTop);
}

if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess().then(midiAccess => {
        midiAccess.inputs.forEach(input => {
            input.onmidimessage = onMIDIMessage;
        });
    });
} else {
    console.error("MIDI not supported in this browser.");
}

requestAnimationFrame(animate);
requestAnimationFrame(animateTop);