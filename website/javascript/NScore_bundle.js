(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/*jshint maxerr: 10000 */

SEQUENCE = require('./sequences/sequences.js');
MODULES = require('./modules/modules.js');
Validation = require('./Validation.js');

const ListToSeq = SEQUENCE.ListToSeq;
const OEISToSeq = SEQUENCE.OEISToSeq;
const BuiltInNameToSeq = SEQUENCE.BuiltInNameToSeq;

function stringToArray(strArr) {
	return JSON.parse("[" + strArr + "]");
}

const NScore = function () {
	const modules = MODULES; //  classes to the drawing modules
	const BuiltInSeqs = SEQUENCE.BuiltInSeqs;
	const validOEIS = VALIDOEIS;
	var preparedSequences = []; // sequenceGenerators to be drawn
	var preparedTools = []; // chosen drawing modules
	var unprocessedSequences = []; //sequences in a saveable format
	var unprocessedTools = []; //tools in a saveable format
	var liveSketches = []; // p5 sketches being drawn

	/**
	 *
	 *
	 * @param {*} moduleClass drawing module to be used for this sketch
	 * @param {*} config corresponding config for drawing module
	 * @param {*} seq sequence to be passed to drawing module
	 * @param {*} divID div where sketch will be placed
	 * @param {*} width width of sketch
	 * @param {*} height height of sketch
	 * @returns p5 sketch
	 */

	const generateP5 = function (moduleClass, config, seq, divID, width, height) {
		//Create canvas element here
		var div = document.createElement('div');
		//The style of the canvases will be "canvasClass"
		div.className = "canvasClass";
		div.id = "liveCanvas" + divID;
		document.getElementById("canvasArea").appendChild(div);
		//-------------------------------------------
		//Create P5js instance
		let myp5 = new p5(function (sketch) {
			let moduleInstance = new moduleClass(seq, sketch, config);
			sketch.setup = function () {
				sketch.createCanvas(width, height);
				sketch.background("white");
				moduleInstance.setup();
			};

			sketch.draw = function () {
				moduleInstance.draw();
			};
		}, div.id);
		return myp5;
	};

	/**
	 * When the user chooses a drawing module and provides corresponding config
	 * it will automatically be passed to this function, which will validate input
	 * and append it to the prepared tools
	 * @param {*} moduleObj information used to prepare the right drawing module, this input
	 * this will contain an ID, the moduleKey which should match a key in MODULES_JSON, and
	 * a config object.
	 */
	const receiveModule = function (moduleObj) {
		if ((moduleObj.ID && moduleObj.moduleKey && moduleObj.config && modules[moduleObj.moduleKey]) == undefined) {
			console.error("One or more undefined module properties received in NScore");
		} else {
			validationResult = Validation.module(moduleObj);
			if (validationResult.errors.length != 0) {
				preparedTools[moduleObj.ID] = null;
				return validationResult.errors;
			}
			moduleObj.config = validationResult.parsedFields;
			preparedTools[moduleObj.ID] = {
				module: modules[moduleObj.moduleKey],
				config: moduleObj.config,
				ID: moduleObj.ID
			};
			unprocessedTools[moduleObj.ID] = moduleObj;
			return true;
		}
	};

	/**
	 * When the user chooses a sequence, we will automatically pass it to this function
	 * which will validate the input, and then depending on the input type, it will prepare
	 * the sequence in some way to get a sequenceGenerator object which will be appended
	 * to preparedSequences
	 * @param {*} seqObj information used to prepare the right sequence, this will contain a
	 * sequence ID, the type of input, and the input itself (sequence name, a list, an OEIS number..etc).
	 */
	const receiveSequence = function (seqObj) {
		if ((seqObj.ID && seqObj.inputType && seqObj.inputValue && seqObj.parameters) == undefined) {
			console.error("One or more undefined module properties received in NScore");
		} else {
			// We will process different inputs in different ways
			if (seqObj.inputType == "builtIn") {
				validationResult = Validation.builtIn(seqObj);
				if (validationResult.errors.length != 0) {
					return validationResult.errors;
				}
				seqObj.parameters = validationResult.parsedFields;
				preparedSequences[seqObj.ID] = BuiltInNameToSeq(seqObj.ID, seqObj.inputValue, seqObj.parameters);
			}
			if (seqObj.inputType == "OEIS") {
				validationResult = Validation.oeis(seqObj);
				if (validationResult.errors.length != 0) {
					return validationResult.errors;
				}
				preparedSequences[seqObj.ID] = OEISToSeq(seqObj.ID, seqObj.inputValue);
			}
			if (seqObj.inputType == "list") {
				validationResult = Validation.list(seqObj);
				if (validationResult.errors.length != 0) {
					return validationResult.errors;
				}
				preparedSequences[seqObj.ID] = ListToSeq(seqObj.ID, seqObj.inputValue);

			}
			if (seqObj.inputType == "code") {
				console.error("Not implemented");
			}
			unprocessedSequences[seqObj.ID] = seqObj;
		}
		return true;
	};
	/**
	 * We initialize the drawing processing. First we calculate the dimensions of each sketch
	 * then we pair up sequences and drawing modules, and finally we pass them to generateP5
	 * which actually instantiates drawing modules and begins drawing.
	 *
	 * @param {*} seqVizPairs a list of pairs where each pair contains an ID of a sequence
	 * and an ID of a drawing tool, this lets us know to pass which sequence to which
	 * drawing tool.
	 */
	const begin = function (seqVizPairs) {
		hideLog();

		//Figuring out layout
		//--------------------------------------
		let totalWidth = document.getElementById('canvasArea').offsetWidth;
		let totalHeight = document.getElementById('canvasArea').offsetHeight;
		let canvasCount = seqVizPairs.length;
		let gridSize = Math.ceil(Math.sqrt(canvasCount));
		let individualWidth = totalWidth / gridSize - 20;
		let individualHeight = totalHeight / gridSize;
		//--------------------------------------

		for (let pair of seqVizPairs) {
			let currentSeq = preparedSequences[pair.seqID];
			let currentTool = preparedTools[pair.toolID];
			if (currentSeq == undefined || currentTool == undefined) {
				console.error("undefined ID for tool or sequence");
			} else {
				liveSketches.push(generateP5(currentTool.module.viz, currentTool.config, currentSeq, liveSketches.length, individualWidth, individualHeight));
			}
		}
	};

	const saveImage = function() {
		liveSketches.forEach(function (sketch) {
			sketch.saveCanvas("Image", "png");
		});
	};

	const makeJSON = function (seqVizPairs) {
		if( unprocessedSequences.length == 0 && unprocessedTools.length == 0 ){
			return "Nothing to save!";
		}
		toShow = [];
		for (let pair of seqVizPairs) {
			toShow.push({
				seq: unprocessedSequences[pair.seqID],
				tool: unprocessedTools[pair.toolID]
			});
		}
		return JSON.stringify(toShow);
	};

	const clear = function () {
		showLog();
		if (liveSketches.length == 0) {
			return;
		} else {
			for (let i = 0; i < liveSketches.length; i++) {
				liveSketches[i].remove(); //delete canvas element
			}
		}
	};

	const pause = function () {
		liveSketches.forEach(function (sketch) {
			sketch.noLoop();
		});
	};

	const resume = function () {
		liveSketches.forEach(function (sketch) {
			sketch.loop();
		});
	};

	const step = function () {
		liveSketches.forEach(function (sketch) {
			sketch.redraw();
		});
	};

	return {
		receiveSequence: receiveSequence,
		receiveModule: receiveModule,
		liveSketches: liveSketches,
		preparedSequences: preparedSequences,
		preparedTools: preparedTools,
		modules: modules,
		validOEIS: validOEIS,
		BuiltInSeqs: BuiltInSeqs,
		makeJSON: makeJSON,
		begin: begin,
		pause: pause,
		resume: resume,
		step: step,
		clear: clear,
		saveImage: saveImage,
	};
}();




const LogPanel = function () {
	logGreen = function (line) {
		$("#innerLogArea").append(`<p style="color:#00ff00">${line}</p><br>`);
	};
	logRed = function (line) {
		$("#innerLogArea").append(`<p style="color:red">${line}</p><br>`);
	};
	clearlog = function () {
		$("#innerLogArea").empty();
	};
	hideLog = function () {
		$("#logArea").css('display', 'none');
	};
	showLog = function () {
		$("#logArea").css('display', 'block');
	};
	return {
		logGreen: logGreen,
		logRed: logRed,
		clearlog: clearlog,
		hideLog: hideLog,
		showLog: showLog,
	};
}();
window.NScore = NScore;
window.LogPanel = LogPanel;

},{"./Validation.js":2,"./modules/modules.js":7,"./sequences/sequences.js":13}],2:[function(require,module,exports){
SEQUENCE = require('./sequences/sequences.js');
VALIDOEIS = require('./validOEIS.js');
MODULES = require('./modules/modules.js');


const Validation = function () {


	const listError = function (title) {
		let msg = "can't parse the list, please pass numbers seperated by commas (example: 1,2,3)";
		if (title != undefined) {
			msg = title + ": " + msg;
		}
		return msg;
	};

	const requiredError = function (title) {
		return `${title}: this is a required value, don't leave it empty!`;
	};

	const typeError = function (title, value, expectedType) {
		return `${title}: ${value} is a ${typeof(value)}, expected a ${expectedType}. `;
	};

	const oeisError = function (code) {
		return `${code}: Either an invalid OEIS code or not defined by sage!`;
	};

	const builtIn = function (seqObj) {
		let schema = SEQUENCE.BuiltInSeqs[seqObj.inputValue].paramsSchema;
		let receivedParams = seqObj.parameters;

		let validationResult = {
			parsedFields: {},
			errors: []
		};
		Object.keys(receivedParams).forEach(
			(parameter) => {
				validateFromSchema(schema, parameter, receivedParams[parameter], validationResult);
			}
		);
		return validationResult;
	};

	const oeis = function (seqObj) {
		let validationResult = {
			parsedFields: {},
			errors: []
		};
		seqObj.inputValue = seqObj.inputValue.trim();
		let oeisCode = seqObj.inputValue;
		if (!VALIDOEIS.includes(oeisCode)) {
			validationResult.errors.push(oeisError(oeisCode));
		}
		return validationResult;
	};

	const list = function (seqObj) {
		let validationResult = {
			parsedFields: {},
			errors: []
		};
		try {
			if (typeof seqObj.inputValue == String) seqObj.inputValue = JSON.parse(seqObj.inputValue);
		} catch (err) {
			validationResult.errors.push(listError());
		}
		return validationResult;
	};

	const _module = function (moduleObj) {
		let schema = MODULES[moduleObj.moduleKey].configSchema;
		let receivedConfig = moduleObj.config;

		let validationResult = {
			parsedFields: {},
			errors: []
		};

		Object.keys(receivedConfig).forEach(
			(configField) => {
				validateFromSchema(schema, configField, receivedConfig[configField], validationResult);
			}
		);
		return validationResult;
	};

	const validateFromSchema = function (schema, field, value, validationResult) {
		let title = schema[field].title;
		if (typeof (value) == "string") {
			value = value.trim();
		}
		let expectedType = schema[field].type;
		let required = (schema[field].required !== undefined) ? schema[field].required : false;
		let format = (schema[field].format !== undefined) ? schema[field].format : false;
		let isEmpty = (value === '');
		if (required && isEmpty) {
			validationResult.errors.push(requiredError(title));
		}
		if (isEmpty) {
			parsed = '';
		}
		if (!isEmpty && (expectedType == "number")) {
			parsed = parseInt(value);
			if (parsed != parsed) { // https://stackoverflow.com/questions/34261938/what-is-the-difference-between-nan-nan-and-nan-nan
				validationResult.errors.push(typeError(title, value, expectedType));
			}
		}
		if (!isEmpty && (expectedType == "string")) {
			parsed = value;
		}
		if (!isEmpty && (expectedType == "boolean")) {
			if (value == '1') {
				parsed = true;
			} else {
				parsed = false;
			}
		}
		if (format && (format == "list")) {
			try {
				parsed = JSON.parse("[" + value + "]");
			} catch (err) {
				validationResult.errors.push(listError(title));
			}
		}
		if (parsed !== undefined) {
			validationResult.parsedFields[field] = parsed;
		}
	};

	return {
		builtIn: builtIn,
		oeis: oeis,
		list: list,
		module: _module
	};
}();

module.exports = Validation;
},{"./modules/modules.js":7,"./sequences/sequences.js":13,"./validOEIS.js":14}],3:[function(require,module,exports){
/*
    var list=[2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293, 307, 311, 313, 317, 331, 337, 347, 349, 353, 359, 367, 373, 379, 383, 389, 397, 401, 409, 419, 421, 431, 433, 439, 443, 449, 457, 461, 463, 467, 479, 487, 491, 499, 503, 509, 521, 523, 541, 547, 557, 563, 569, 571, 577, 587, 593, 599, 601, 607, 613, 617, 619, 631, 641, 643, 647, 653, 659, 661, 673, 677, 683, 691, 701, 709, 719, 727, 733, 739, 743, 751, 757, 761, 769, 773, 787, 797, 809, 811, 821, 823, 827, 829, 839, 853, 857, 859, 863, 877, 881, 883, 887, 907, 911, 919, 929, 937, 941, 947, 953, 967, 971, 977, 983, 991, 997, 1009, 1013, 1019, 1021, 1031, 1033, 1039, 1049, 1051, 1061, 1063, 1069, 1087, 1091, 1093, 1097, 1103, 1109, 1117, 1123, 1129, 1151, 1153, 1163, 1171, 1181, 1187, 1193, 1201, 1213, 1217, 1223];

*/

class VIZ_Differences {
	constructor(seq, sketch, config) {

		this.n = config.n; //n is number of terms of top sequence
		this.levels = config.Levels; //levels is number of layers of the pyramid/trapezoid created by writing the differences.
		this.seq = seq;
		this.sketch = sketch;
	}

	drawDifferences(n, levels, sequence) {

		//changed background color to grey since you can't see what's going on
		this.sketch.background('black');

		n = Math.min(n, sequence.length);
		levels = Math.min(levels, n - 1);
		let font, fontSize = 20;
		this.sketch.textFont("Arial");
		this.sketch.textSize(fontSize);
		this.sketch.textStyle(this.sketch.BOLD);
		let xDelta = 50;
		let yDelta = 50;
		let firstX = 30;
		let firstY = 30;
		this.sketch.colorMode(this.sketch.HSB, 255);
		let myColor = this.sketch.color(100, 255, 150);
		let hue;

		let workingSequence = [];

		for (let i = 0; i < this.n; i++) {
			workingSequence.push(sequence.getElement(i)); //workingSequence cannibalizes first n elements of sequence.
		}


		for (let i = 0; i < this.levels; i++) {
			hue = (i * 255 / 6) % 255;
			myColor = this.sketch.color(hue, 150, 200);
			this.sketch.fill(myColor);
			for (let j = 0; j < workingSequence.length; j++) {
				this.sketch.text(workingSequence[j], firstX + j * xDelta, firstY + i * yDelta); //Draws and updates workingSequence simultaneously.
				if (j < workingSequence.length - 1) {
					workingSequence[j] = workingSequence[j + 1] - workingSequence[j];
				}
			}

			workingSequence.length = workingSequence.length - 1; //Removes last element.
			firstX = firstX + (1 / 2) * xDelta; //Moves line forward half for pyramid shape.

		}

	}
	setup() {}
	draw() {
		this.drawDifferences(this.n, this.levels, this.seq);
		this.sketch.noLoop();
	}
}



const SCHEMA_Differences = {
	n: {
		type: 'number',
		title: 'N',
		description: 'Number of elements',
		required: true
	},
	Levels: {
		type: 'number',
		title: 'Levels',
		description: 'Number of levels',
		required: true
	},
};

const MODULE_Differences = {
	viz: VIZ_Differences,
	name: "Differences",
	description: "",
	configSchema: SCHEMA_Differences
};


module.exports = MODULE_Differences;
},{}],4:[function(require,module,exports){
//An example module


class VIZ_ModFill {
	constructor(seq, sketch, config) {
		this.sketch = sketch;
		this.seq = seq;
		this.modDimension = config.modDimension;
		this.i = 0;
	}

	drawNew(num, seq) {
		let black = this.sketch.color(0);
		this.sketch.fill(black);
		let i;
		let j;
		for (let mod = 1; mod <= this.modDimension; mod++) {
			i = seq.getElement(num) % mod;
			j = mod - 1;
			this.sketch.rect(j * this.rectWidth, this.sketch.height - (i + 1) * this.rectHeight, this.rectWidth, this.rectHeight);
		}

	}

	setup() {
		this.rectWidth = this.sketch.width / this.modDimension;
		this.rectHeight = this.sketch.height / this.modDimension;
		this.sketch.noStroke();
	}

	draw() {
		this.drawNew(this.i, this.seq);
		this.i++;
		if (i == 1000) {
			this.sketch.noLoop();
		}
	}

}

const SCHEMA_ModFill = {
	modDimension: {
		type: "number",
		title: "Mod dimension",
		description: "",
		required: true
	}
};


const MODULE_ModFill = {
	viz: VIZ_ModFill,
	name: "Mod Fill",
	description: "",
	configSchema: SCHEMA_ModFill
};

module.exports = MODULE_ModFill;
},{}],5:[function(require,module,exports){
class VIZ_shiftCompare {
	constructor(seq, sketch, config) {
		//Sketch is your canvas
		//config is the parameters you expect
		//seq is the sequence you are drawing
		this.sketch = sketch;
		this.seq = seq;
		this.MOD = 2;
		// Set up the image once.
	}


	setup() {
		console.log(this.sketch.height, this.sketch.width);
		this.img = this.sketch.createImage(this.sketch.width, this.sketch.height);
		this.img.loadPixels(); // Enables pixel-level editing.
	}

	clip(a, min, max) {
		if (a < min) {
			return min;
		} else if (a > max) {
			return max;
		}
		return a;
	}


	draw() { //This will be called everytime to draw
		// Ensure mouse coordinates are sane.
		// Mouse coordinates look they're floats by default.

		let d = this.sketch.pixelDensity();
		let mx = this.clip(Math.round(this.sketch.mouseX), 0, this.sketch.width);
		let my = this.clip(Math.round(this.sketch.mouseY), 0, this.sketch.height);
		if (this.sketch.key == 'ArrowUp') {
			this.MOD += 1;
			this.sketch.key = null;
			console.log("UP PRESSED, NEW MOD: " + this.MOD);
		} else if (this.sketch.key == 'ArrowDown') {
			this.MOD -= 1;
			this.sketch.key = null;
			console.log("DOWN PRESSED, NEW MOD: " + this.MOD);
		} else if (this.sketch.key == 'ArrowRight') {
			console.log(console.log("MX: " + mx + " MY: " + my));
		}
		// Write to image, then to screen for speed.
		for (let x = 0; x < this.sketch.width; x++) {
			for (let y = 0; y < this.sketch.height; y++) {
				for (let i = 0; i < d; i++) {
					for (let j = 0; j < d; j++) {
						let index = 4 * ((y * d + j) * this.sketch.width * d + (x * d + i));
						if (this.seq.getElement(x) % (this.MOD) == this.seq.getElement(y) % (this.MOD)) {
							this.img.pixels[index] = 255;
							this.img.pixels[index + 1] = 255;
							this.img.pixels[index + 2] = 255;
							this.img.pixels[index + 3] = 255;
						} else {
							this.img.pixels[index] = 0;
							this.img.pixels[index + 1] = 0;
							this.img.pixels[index + 2] = 0;
							this.img.pixels[index + 3] = 255;
						}
					}
				}
			}
		}

		this.img.updatePixels(); // Copies our edited pixels to the image.

		this.sketch.image(this.img, 0, 0); // Display image to screen.this.sketch.line(50,50,100,100);
	}
}


const MODULE_ShiftCompare = {
	viz: VIZ_shiftCompare,
	name: "Shift Compare",
	description: "",
	configSchema: {}
};

module.exports = MODULE_ShiftCompare;
},{}],6:[function(require,module,exports){
class VIZ_Turtle {
	constructor(seq, sketch, config) {
		var domain = config.domain;
		var range = config.range;
		this.rotMap = {};
		for (let i = 0; i < domain.length; i++) {
			this.rotMap[domain[i]] = (Math.PI / 180) * range[i];
		}
		this.stepSize = config.stepSize;
		this.bgColor = config.bgColor;
		this.strokeColor = config.strokeColor;
		this.strokeWidth = config.strokeWeight;
		this.seq = seq;
		this.currentIndex = 0;
		this.orientation = 0;
		this.sketch = sketch;
		if (config.startingX != "") {
			this.X = config.startingX;
			this.Y = config.startingY;
		} else {
			this.X = null;
			this.Y = null;
		}
	}

	stepDraw() {
		let oldX = this.X;
		let oldY = this.Y;
		let currElement = this.seq.getElement(this.currentIndex++);
		let angle = this.rotMap[currElement];
		if (angle == undefined) {
			throw ('angle undefined for element: ' + currElement);
		}
		this.orientation = (this.orientation + angle);
		this.X += this.stepSize * Math.cos(this.orientation);
		this.Y += this.stepSize * Math.sin(this.orientation);
		this.sketch.line(oldX, oldY, this.X, this.Y);
	}
	setup() {
		this.X = this.sketch.width / 2;
		this.Y = this.sketch.height / 2;
		this.sketch.background(this.bgColor);
		this.sketch.stroke(this.strokeColor);
		this.sketch.strokeWeight(this.strokeWidth);
	}
	draw() {
		this.stepDraw();
	}
}


const SCHEMA_Turtle = {
	domain: {
		type: 'string',
		title: 'Sequence Domain',
		description: 'Comma seperated numbers',
		format: 'list',
		default: "0,1,2,3,4",
		required: true
	},
	range: {
		type: 'string',
		title: 'Angles',
		default: "30,45,60,90,120",
		format: 'list',
		description: 'Comma seperated numbers',
		required: true
	},
	stepSize: {
		type: 'number',
		title: 'Step Size',
		default: 20,
		required: true
	},
	strokeWeight: {
		type: 'number',
		title: 'Stroke Width',
		default: 5,
		required: true
	},
	startingX: {
		type: 'number',
		tite: 'X start'
	},
	startingY: {
		type: 'number',
		tite: 'Y start'
	},
	bgColor: {
		type: 'string',
		title: 'Background Color',
		format: 'color',
		default: "#666666",
		required: false
	},
	strokeColor: {
		type: 'string',
		title: 'Stroke Color',
		format: 'color',
		default: '#ff0000',
		required: false
	},
};

const MODULE_Turtle = {
	viz: VIZ_Turtle,
	name: "Turtle",
	description: "",
	configSchema: SCHEMA_Turtle
};


module.exports = MODULE_Turtle;

},{}],7:[function(require,module,exports){
//Add an import line here for new modules


//Add new modules to this constant.
const MODULES = {};

module.exports = MODULES;

/*jshint ignore:start */
MODULES["Turtle"] = require('./moduleTurtle.js');
MODULES["ShiftCompare"] = require('./moduleShiftCompare.js');
MODULES["Differences"] = require('./moduleDifferences.js');
MODULES["ModFill"] = require('./moduleModFill.js');

},{"./moduleDifferences.js":3,"./moduleModFill.js":4,"./moduleShiftCompare.js":5,"./moduleTurtle.js":6}],8:[function(require,module,exports){
SEQ_linearRecurrence = require('./sequenceLinRec.js');

function GEN_fibonacci({
    m
}) {
    return SEQ_linearRecurrence.generator({
        coefficientList: [1, 1],
        seedList: [1, 1],
        m
    });
}

const SCHEMA_Fibonacci = {
    m: {
        type: 'number',
        title: 'Mod',
        description: 'A number to mod the sequence by by',
        required: false
    }
};


const SEQ_fibonacci = {
    generator: GEN_fibonacci,
    name: "Fibonacci",
    description: "",
    paramsSchema: SCHEMA_Fibonacci
};

module.exports = SEQ_fibonacci;
},{"./sequenceLinRec.js":9}],9:[function(require,module,exports){
function GEN_linearRecurrence({
    coefficientList,
    seedList,
    m
}) {
    if (coefficientList.length != seedList.length) {
        //Number of seeds should match the number of coefficients
        console.log("number of coefficients not equal to number of seeds ");
        return null;
    }
    let k = coefficientList.length;
    let genericLinRec;
    if (m != null) {
        for (let i = 0; i < coefficientList.length; i++) {
            coefficientList[i] = coefficientList[i] % m;
            seedList[i] = seedList[i] % m;
        }
        genericLinRec = function (n, cache) {
            if (n < seedList.length) {
                cache[n] = seedList[n];
                return cache[n];
            }
            for (let i = cache.length; i <= n; i++) {
                let sum = 0;
                for (let j = 0; j < k; j++) {
                    sum += cache[i - j - 1] * coefficientList[j];
                }
                cache[i] = sum % m;
            }
            return cache[n];
        };
    } else {
        genericLinRec = function (n, cache) {
            if (n < seedList.length) {
                cache[n] = seedList[n];
                return cache[n];
            }

            for (let i = cache.length; i <= n; i++) {
                let sum = 0;
                for (let j = 0; j < k; j++) {
                    sum += cache[i - j - 1] * coefficientList[j];
                }
                cache[i] = sum;
            }
            return cache[n];
        };
    }
    return genericLinRec;
}

const SCHEMA_linearRecurrence = {
    coefficientList: {
        type: 'string',
        title: 'Coefficients list',
        format: 'list',
        description: 'Comma seperated numbers',
        required: true
    },
    seedList: {
        type: 'string',
        title: 'Seed list',
        format: 'list',
        description: 'Comma seperated numbers',
        required: true
    },
    m: {
        type: 'number',
        title: 'Mod',
        description: 'A number to mod the sequence by by',
        required: false
    }
};


const SEQ_linearRecurrence = {
    generator: GEN_linearRecurrence,
    name: "Linear Recurrence",
    description: "",
    paramsSchema: SCHEMA_linearRecurrence
};

module.exports = SEQ_linearRecurrence;
},{}],10:[function(require,module,exports){
const SEQ_linearRecurrence = require('./sequenceLinRec.js');

function GEN_Lucas({
    m
}) {
    return SEQ_linearRecurrence.generator({
        coefficientList: [1, 1],
        seedList: [2, 1],
        m
    });
}

const SCHEMA_Lucas = {
    m: {
        type: 'number',
        title: 'Mod',
        description: 'A number to mod the sequence by by',
        required: false
    }
};


const SEQ_Lucas = {
    generator: GEN_Lucas,
    name: "Lucas",
    description: "",
    paramsSchema: SCHEMA_Lucas
};

module.exports = SEQ_Lucas;
},{"./sequenceLinRec.js":9}],11:[function(require,module,exports){
function GEN_Naturals({
    includezero
}) {
    if (includezero) {
        return ((n) => n);
    } else {
        return ((n) => n + 1);
    }
}

const SCHEMA_Naturals = {
    includezero: {
        type: 'boolean',
        title: 'Include zero',
        description: '',
        default: 'false',
        required: false
    }
};


const SEQ_Naturals = {
    generator: GEN_Naturals,
    name: "Naturals",
    description: "",
    paramsSchema: SCHEMA_Naturals
};

// export default SEQ_Naturals
module.exports = SEQ_Naturals;
},{}],12:[function(require,module,exports){
function GEN_Primes() {
    const primes = function (n, cache) {
        if (cache.length == 0) {
            cache.push(2);
            cache.push(3);
            cache.push(5);
        }
        let i = cache[cache.length - 1] + 1;
        let k = 0;
        while (cache.length <= n) {
            let isPrime = true;
            for (let j = 0; j < cache.length; j++) {
                if (i % cache[j] == 0) {
                    isPrime = false;
                    break;
                }
            }
            if (isPrime) {
                cache.push(i);
            }
            i++;
        }
        return cache[n];
    };
    return primes;
}


const SCHEMA_Primes = {
    m: {
        type: 'number',
        title: 'Mod',
        description: 'A number to mod the sequence by',
        required: false
    }
};


const SEQ_Primes = {
    generator: GEN_Primes,
    name: "Primes",
    description: "",
    paramsSchema: SCHEMA_Primes
};

module.exports = SEQ_Primes;
},{}],13:[function(require,module,exports){
/**
 *
 * @class SequenceGenerator
 */
class SequenceGenerator {
    /**
     *Creates an instance of SequenceGenerator.
     * @param {*} generator a function that takes a natural number and returns a number, it can optionally take the cache as a second argument
     * @param {*} ID the ID of the sequence
     * @memberof SequenceGenerator
     */
    constructor(ID, generator) {
        this.generator = generator;
        this.ID = ID;
        this.cache = [];
        this.newSize = 1;
    }
    /**
     * if we need to get the nth element and it's not present in
     * in the cache, then we either double the size, or the
     * new size becomes n+1
     * @param {*} n
     * @memberof SequenceGenerator
     */
    resizeCache(n) {
        this.newSize = this.cache.length * 2;
        if (n + 1 > this.newSize) {
            this.newSize = n + 1;
        }
    }
    /**
     * Populates the cache up until the current newSize
     * this is called after resizeCache
     * @memberof SequenceGenerator
     */
    fillCache() {
        for (let i = this.cache.length; i < this.newSize; i++) {
            //the generator is given the cache since it would make computation more efficient sometimes
            //but the generator doesn't necessarily need to take more than one argument.
            this.cache[i] = this.generator(i, this.cache);
        }
    }
    /**
     * Get element is what the drawing tools will be calling, it retrieves
     * the nth element of the sequence by either getting it from the cache
     * or if isn't present, by building the cache and then getting it
     * @param {*} n the index of the element in the sequence we want
     * @returns a number
     * @memberof SequenceGenerator
     */
    getElement(n) {
        if (this.cache[n] != undefined || this.finite) {
            // console.log("cache hit")
            return this.cache[n];
        } else {
            // console.log("cache miss")
            this.resizeCache(n);
            this.fillCache();
            return this.cache[n];
        }
    }
}


/**
 *
 *
 * @param {*} code arbitrary sage code to be executed on aleph
 * @returns ajax response object
 */
function sageExecute(code) {
    return $.ajax({
        type: 'POST',
        async: false,
        url: 'http://aleph.sagemath.org/service',
        data: "code=" + code
    });
}

/**
 *
 *
 * @param {*} code arbitrary sage code to be executed on aleph
 * @returns ajax response object
 */
async function sageExecuteAsync(code) {
    return await $.ajax({
        type: 'POST',
        url: 'http://aleph.sagemath.org/service',
        data: "code=" + code
    });
}


class OEISSequenceGenerator {
    constructor(ID, OEIS) {
        this.OEIS = OEIS;
        this.ID = ID;
        this.cache = [];
        this.newSize = 1;
        this.prefillCache();
    }
    oeisFetch(n) {
        console.log("Fetching..");
        let code = `print(sloane.${this.OEIS}.list(${n}))`;
        let resp = sageExecute(code);
        return JSON.parse(resp.responseJSON.stdout);
    }
    async prefillCache() {
        this.resizeCache(3000);
        let code = `print(sloane.${this.OEIS}.list(${this.newSize}))`;
        let resp = await sageExecuteAsync(code);
        console.log(resp);
        this.cache = this.cache.concat(JSON.parse(resp.stdout));
    }
    resizeCache(n) {
        this.newSize = this.cache.length * 2;
        if (n + 1 > this.newSize) {
            this.newSize = n + 1;
        }
    }
    fillCache() {
        let newList = this.oeisFetch(this.newSize);
        this.cache = this.cache.concat(newList);
    }
    getElement(n) {
        if (this.cache[n] != undefined) {
            return this.cache[n];
        } else {
            this.resizeCache();
            this.fillCache();
            return this.cache[n];
        }
    }
}

function BuiltInNameToSeq(ID, seqName, seqParams) {
    let generator = BuiltInSeqs[seqName].generator(seqParams);
    return new SequenceGenerator(ID, generator);
}


function ListToSeq(ID, list) {
    let listGenerator = function (n) {
        return list[n];
    };
    return new SequenceGenerator(ID, listGenerator);
}

function OEISToSeq(ID, OEIS) {
    return new OEISSequenceGenerator(ID, OEIS);
}


const BuiltInSeqs = {};


module.exports = {
    'BuiltInNameToSeq': BuiltInNameToSeq,
    'ListToSeq': ListToSeq,
    'OEISToSeq': OEISToSeq,
    'BuiltInSeqs': BuiltInSeqs
};

/*jshint ignore: start */
BuiltInSeqs["Fibonacci"] = require('./sequenceFibonacci.js');
BuiltInSeqs["Lucas"] = require('./sequenceLucas.js');
BuiltInSeqs["Primes"] = require('./sequencePrimes.js');
BuiltInSeqs["Naturals"] = require('./sequenceNaturals.js');
BuiltInSeqs["LinRec"] = require('./sequenceLinRec.js');
BuiltInSeqs['Primes'] = require('./sequencePrimes.js');
},{"./sequenceFibonacci.js":8,"./sequenceLinRec.js":9,"./sequenceLucas.js":10,"./sequenceNaturals.js":11,"./sequencePrimes.js":12}],14:[function(require,module,exports){
module.exports = ["A000001", "A000027", "A000004", "A000005", "A000008", "A000009", "A000796", "A003418", "A007318", "A008275", "A008277", "A049310", "A000010", "A000007", "A005843", "A000035", "A000169", "A000272", "A000312", "A001477", "A004526", "A000326", "A002378", "A002620", "A005408", "A000012", "A000120", "A010060", "A000069", "A001969", "A000290", "A000225", "A000015", "A000016", "A000032", "A004086", "A002113", "A000030", "A000040", "A002808", "A018252", "A000043", "A000668", "A000396", "A005100", "A005101", "A002110", "A000720", "A064553", "A001055", "A006530", "A000961", "A005117", "A020639", "A000041", "A000045", "A000108", "A001006", "A000079", "A000578", "A000244", "A000302", "A000583", "A000142", "A000085", "A001189", "A000670", "A006318", "A000165", "A001147", "A006882", "A000984", "A001405", "A000292", "A000330", "A000153", "A000255", "A000261", "A001909", "A001910", "A090010", "A055790", "A090012", "A090013", "A090014", "A090015", "A090016", "A000166", "A000203", "A001157", "A008683", "A000204", "A000217", "A000124", "A002275", "A001110", "A051959", "A001221", "A001222", "A046660", "A001227", "A001358", "A001694", "A001836", "A001906", "A001333", "A001045", "A000129", "A001109", "A015521", "A015523", "A015530", "A015531", "A015551", "A082411", "A083103", "A083104", "A083105", "A083216", "A061084", "A000213", "A000073", "A079922", "A079923", "A109814", "A111774", "A111775", "A111787", "A000110", "A000587", "A000100"]

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJ3ZWJzaXRlL2phdmFzY3JpcHQvTlNjb3JlLmpzIiwid2Vic2l0ZS9qYXZhc2NyaXB0L1ZhbGlkYXRpb24uanMiLCJ3ZWJzaXRlL2phdmFzY3JpcHQvbW9kdWxlcy9tb2R1bGVEaWZmZXJlbmNlcy5qcyIsIndlYnNpdGUvamF2YXNjcmlwdC9tb2R1bGVzL21vZHVsZU1vZEZpbGwuanMiLCJ3ZWJzaXRlL2phdmFzY3JpcHQvbW9kdWxlcy9tb2R1bGVTaGlmdENvbXBhcmUuanMiLCJ3ZWJzaXRlL2phdmFzY3JpcHQvbW9kdWxlcy9tb2R1bGVUdXJ0bGUuanMiLCJ3ZWJzaXRlL2phdmFzY3JpcHQvbW9kdWxlcy9tb2R1bGVzLmpzIiwid2Vic2l0ZS9qYXZhc2NyaXB0L3NlcXVlbmNlcy9zZXF1ZW5jZUZpYm9uYWNjaS5qcyIsIndlYnNpdGUvamF2YXNjcmlwdC9zZXF1ZW5jZXMvc2VxdWVuY2VMaW5SZWMuanMiLCJ3ZWJzaXRlL2phdmFzY3JpcHQvc2VxdWVuY2VzL3NlcXVlbmNlTHVjYXMuanMiLCJ3ZWJzaXRlL2phdmFzY3JpcHQvc2VxdWVuY2VzL3NlcXVlbmNlTmF0dXJhbHMuanMiLCJ3ZWJzaXRlL2phdmFzY3JpcHQvc2VxdWVuY2VzL3NlcXVlbmNlUHJpbWVzLmpzIiwid2Vic2l0ZS9qYXZhc2NyaXB0L3NlcXVlbmNlcy9zZXF1ZW5jZXMuanMiLCJ3ZWJzaXRlL2phdmFzY3JpcHQvdmFsaWRPRUlTLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUtBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIvKmpzaGludCBtYXhlcnI6IDEwMDAwICovXHJcblxyXG5TRVFVRU5DRSA9IHJlcXVpcmUoJy4vc2VxdWVuY2VzL3NlcXVlbmNlcy5qcycpO1xyXG5NT0RVTEVTID0gcmVxdWlyZSgnLi9tb2R1bGVzL21vZHVsZXMuanMnKTtcclxuVmFsaWRhdGlvbiA9IHJlcXVpcmUoJy4vVmFsaWRhdGlvbi5qcycpO1xyXG5cclxuY29uc3QgTGlzdFRvU2VxID0gU0VRVUVOQ0UuTGlzdFRvU2VxO1xyXG5jb25zdCBPRUlTVG9TZXEgPSBTRVFVRU5DRS5PRUlTVG9TZXE7XHJcbmNvbnN0IEJ1aWx0SW5OYW1lVG9TZXEgPSBTRVFVRU5DRS5CdWlsdEluTmFtZVRvU2VxO1xyXG5cclxuZnVuY3Rpb24gc3RyaW5nVG9BcnJheShzdHJBcnIpIHtcclxuXHRyZXR1cm4gSlNPTi5wYXJzZShcIltcIiArIHN0ckFyciArIFwiXVwiKTtcclxufVxyXG5cclxuY29uc3QgTlNjb3JlID0gZnVuY3Rpb24gKCkge1xyXG5cdGNvbnN0IG1vZHVsZXMgPSBNT0RVTEVTOyAvLyAgY2xhc3NlcyB0byB0aGUgZHJhd2luZyBtb2R1bGVzXHJcblx0Y29uc3QgQnVpbHRJblNlcXMgPSBTRVFVRU5DRS5CdWlsdEluU2VxcztcclxuXHRjb25zdCB2YWxpZE9FSVMgPSBWQUxJRE9FSVM7XHJcblx0dmFyIHByZXBhcmVkU2VxdWVuY2VzID0gW107IC8vIHNlcXVlbmNlR2VuZXJhdG9ycyB0byBiZSBkcmF3blxyXG5cdHZhciBwcmVwYXJlZFRvb2xzID0gW107IC8vIGNob3NlbiBkcmF3aW5nIG1vZHVsZXNcclxuXHR2YXIgdW5wcm9jZXNzZWRTZXF1ZW5jZXMgPSBbXTsgLy9zZXF1ZW5jZXMgaW4gYSBzYXZlYWJsZSBmb3JtYXRcclxuXHR2YXIgdW5wcm9jZXNzZWRUb29scyA9IFtdOyAvL3Rvb2xzIGluIGEgc2F2ZWFibGUgZm9ybWF0XHJcblx0dmFyIGxpdmVTa2V0Y2hlcyA9IFtdOyAvLyBwNSBza2V0Y2hlcyBiZWluZyBkcmF3blxyXG5cclxuXHQvKipcclxuXHQgKlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHsqfSBtb2R1bGVDbGFzcyBkcmF3aW5nIG1vZHVsZSB0byBiZSB1c2VkIGZvciB0aGlzIHNrZXRjaFxyXG5cdCAqIEBwYXJhbSB7Kn0gY29uZmlnIGNvcnJlc3BvbmRpbmcgY29uZmlnIGZvciBkcmF3aW5nIG1vZHVsZVxyXG5cdCAqIEBwYXJhbSB7Kn0gc2VxIHNlcXVlbmNlIHRvIGJlIHBhc3NlZCB0byBkcmF3aW5nIG1vZHVsZVxyXG5cdCAqIEBwYXJhbSB7Kn0gZGl2SUQgZGl2IHdoZXJlIHNrZXRjaCB3aWxsIGJlIHBsYWNlZFxyXG5cdCAqIEBwYXJhbSB7Kn0gd2lkdGggd2lkdGggb2Ygc2tldGNoXHJcblx0ICogQHBhcmFtIHsqfSBoZWlnaHQgaGVpZ2h0IG9mIHNrZXRjaFxyXG5cdCAqIEByZXR1cm5zIHA1IHNrZXRjaFxyXG5cdCAqL1xyXG5cclxuXHRjb25zdCBnZW5lcmF0ZVA1ID0gZnVuY3Rpb24gKG1vZHVsZUNsYXNzLCBjb25maWcsIHNlcSwgZGl2SUQsIHdpZHRoLCBoZWlnaHQpIHtcclxuXHRcdC8vQ3JlYXRlIGNhbnZhcyBlbGVtZW50IGhlcmVcclxuXHRcdHZhciBkaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuXHRcdC8vVGhlIHN0eWxlIG9mIHRoZSBjYW52YXNlcyB3aWxsIGJlIFwiY2FudmFzQ2xhc3NcIlxyXG5cdFx0ZGl2LmNsYXNzTmFtZSA9IFwiY2FudmFzQ2xhc3NcIjtcclxuXHRcdGRpdi5pZCA9IFwibGl2ZUNhbnZhc1wiICsgZGl2SUQ7XHJcblx0XHRkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNhbnZhc0FyZWFcIikuYXBwZW5kQ2hpbGQoZGl2KTtcclxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cdFx0Ly9DcmVhdGUgUDVqcyBpbnN0YW5jZVxyXG5cdFx0bGV0IG15cDUgPSBuZXcgcDUoZnVuY3Rpb24gKHNrZXRjaCkge1xyXG5cdFx0XHRsZXQgbW9kdWxlSW5zdGFuY2UgPSBuZXcgbW9kdWxlQ2xhc3Moc2VxLCBza2V0Y2gsIGNvbmZpZyk7XHJcblx0XHRcdHNrZXRjaC5zZXR1cCA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdFx0XHRza2V0Y2guY3JlYXRlQ2FudmFzKHdpZHRoLCBoZWlnaHQpO1xyXG5cdFx0XHRcdHNrZXRjaC5iYWNrZ3JvdW5kKFwid2hpdGVcIik7XHJcblx0XHRcdFx0bW9kdWxlSW5zdGFuY2Uuc2V0dXAoKTtcclxuXHRcdFx0fTtcclxuXHJcblx0XHRcdHNrZXRjaC5kcmF3ID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRcdG1vZHVsZUluc3RhbmNlLmRyYXcoKTtcclxuXHRcdFx0fTtcclxuXHRcdH0sIGRpdi5pZCk7XHJcblx0XHRyZXR1cm4gbXlwNTtcclxuXHR9O1xyXG5cclxuXHQvKipcclxuXHQgKiBXaGVuIHRoZSB1c2VyIGNob29zZXMgYSBkcmF3aW5nIG1vZHVsZSBhbmQgcHJvdmlkZXMgY29ycmVzcG9uZGluZyBjb25maWdcclxuXHQgKiBpdCB3aWxsIGF1dG9tYXRpY2FsbHkgYmUgcGFzc2VkIHRvIHRoaXMgZnVuY3Rpb24sIHdoaWNoIHdpbGwgdmFsaWRhdGUgaW5wdXRcclxuXHQgKiBhbmQgYXBwZW5kIGl0IHRvIHRoZSBwcmVwYXJlZCB0b29sc1xyXG5cdCAqIEBwYXJhbSB7Kn0gbW9kdWxlT2JqIGluZm9ybWF0aW9uIHVzZWQgdG8gcHJlcGFyZSB0aGUgcmlnaHQgZHJhd2luZyBtb2R1bGUsIHRoaXMgaW5wdXRcclxuXHQgKiB0aGlzIHdpbGwgY29udGFpbiBhbiBJRCwgdGhlIG1vZHVsZUtleSB3aGljaCBzaG91bGQgbWF0Y2ggYSBrZXkgaW4gTU9EVUxFU19KU09OLCBhbmRcclxuXHQgKiBhIGNvbmZpZyBvYmplY3QuXHJcblx0ICovXHJcblx0Y29uc3QgcmVjZWl2ZU1vZHVsZSA9IGZ1bmN0aW9uIChtb2R1bGVPYmopIHtcclxuXHRcdGlmICgobW9kdWxlT2JqLklEICYmIG1vZHVsZU9iai5tb2R1bGVLZXkgJiYgbW9kdWxlT2JqLmNvbmZpZyAmJiBtb2R1bGVzW21vZHVsZU9iai5tb2R1bGVLZXldKSA9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0Y29uc29sZS5lcnJvcihcIk9uZSBvciBtb3JlIHVuZGVmaW5lZCBtb2R1bGUgcHJvcGVydGllcyByZWNlaXZlZCBpbiBOU2NvcmVcIik7XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHR2YWxpZGF0aW9uUmVzdWx0ID0gVmFsaWRhdGlvbi5tb2R1bGUobW9kdWxlT2JqKTtcclxuXHRcdFx0aWYgKHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzLmxlbmd0aCAhPSAwKSB7XHJcblx0XHRcdFx0cHJlcGFyZWRUb29sc1ttb2R1bGVPYmouSURdID0gbnVsbDtcclxuXHRcdFx0XHRyZXR1cm4gdmFsaWRhdGlvblJlc3VsdC5lcnJvcnM7XHJcblx0XHRcdH1cclxuXHRcdFx0bW9kdWxlT2JqLmNvbmZpZyA9IHZhbGlkYXRpb25SZXN1bHQucGFyc2VkRmllbGRzO1xyXG5cdFx0XHRwcmVwYXJlZFRvb2xzW21vZHVsZU9iai5JRF0gPSB7XHJcblx0XHRcdFx0bW9kdWxlOiBtb2R1bGVzW21vZHVsZU9iai5tb2R1bGVLZXldLFxyXG5cdFx0XHRcdGNvbmZpZzogbW9kdWxlT2JqLmNvbmZpZyxcclxuXHRcdFx0XHRJRDogbW9kdWxlT2JqLklEXHJcblx0XHRcdH07XHJcblx0XHRcdHVucHJvY2Vzc2VkVG9vbHNbbW9kdWxlT2JqLklEXSA9IG1vZHVsZU9iajtcclxuXHRcdFx0cmV0dXJuIHRydWU7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0LyoqXHJcblx0ICogV2hlbiB0aGUgdXNlciBjaG9vc2VzIGEgc2VxdWVuY2UsIHdlIHdpbGwgYXV0b21hdGljYWxseSBwYXNzIGl0IHRvIHRoaXMgZnVuY3Rpb25cclxuXHQgKiB3aGljaCB3aWxsIHZhbGlkYXRlIHRoZSBpbnB1dCwgYW5kIHRoZW4gZGVwZW5kaW5nIG9uIHRoZSBpbnB1dCB0eXBlLCBpdCB3aWxsIHByZXBhcmVcclxuXHQgKiB0aGUgc2VxdWVuY2UgaW4gc29tZSB3YXkgdG8gZ2V0IGEgc2VxdWVuY2VHZW5lcmF0b3Igb2JqZWN0IHdoaWNoIHdpbGwgYmUgYXBwZW5kZWRcclxuXHQgKiB0byBwcmVwYXJlZFNlcXVlbmNlc1xyXG5cdCAqIEBwYXJhbSB7Kn0gc2VxT2JqIGluZm9ybWF0aW9uIHVzZWQgdG8gcHJlcGFyZSB0aGUgcmlnaHQgc2VxdWVuY2UsIHRoaXMgd2lsbCBjb250YWluIGFcclxuXHQgKiBzZXF1ZW5jZSBJRCwgdGhlIHR5cGUgb2YgaW5wdXQsIGFuZCB0aGUgaW5wdXQgaXRzZWxmIChzZXF1ZW5jZSBuYW1lLCBhIGxpc3QsIGFuIE9FSVMgbnVtYmVyLi5ldGMpLlxyXG5cdCAqL1xyXG5cdGNvbnN0IHJlY2VpdmVTZXF1ZW5jZSA9IGZ1bmN0aW9uIChzZXFPYmopIHtcclxuXHRcdGlmICgoc2VxT2JqLklEICYmIHNlcU9iai5pbnB1dFR5cGUgJiYgc2VxT2JqLmlucHV0VmFsdWUgJiYgc2VxT2JqLnBhcmFtZXRlcnMpID09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHRjb25zb2xlLmVycm9yKFwiT25lIG9yIG1vcmUgdW5kZWZpbmVkIG1vZHVsZSBwcm9wZXJ0aWVzIHJlY2VpdmVkIGluIE5TY29yZVwiKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIFdlIHdpbGwgcHJvY2VzcyBkaWZmZXJlbnQgaW5wdXRzIGluIGRpZmZlcmVudCB3YXlzXHJcblx0XHRcdGlmIChzZXFPYmouaW5wdXRUeXBlID09IFwiYnVpbHRJblwiKSB7XHJcblx0XHRcdFx0dmFsaWRhdGlvblJlc3VsdCA9IFZhbGlkYXRpb24uYnVpbHRJbihzZXFPYmopO1xyXG5cdFx0XHRcdGlmICh2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5sZW5ndGggIT0gMCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRzZXFPYmoucGFyYW1ldGVycyA9IHZhbGlkYXRpb25SZXN1bHQucGFyc2VkRmllbGRzO1xyXG5cdFx0XHRcdHByZXBhcmVkU2VxdWVuY2VzW3NlcU9iai5JRF0gPSBCdWlsdEluTmFtZVRvU2VxKHNlcU9iai5JRCwgc2VxT2JqLmlucHV0VmFsdWUsIHNlcU9iai5wYXJhbWV0ZXJzKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoc2VxT2JqLmlucHV0VHlwZSA9PSBcIk9FSVNcIikge1xyXG5cdFx0XHRcdHZhbGlkYXRpb25SZXN1bHQgPSBWYWxpZGF0aW9uLm9laXMoc2VxT2JqKTtcclxuXHRcdFx0XHRpZiAodmFsaWRhdGlvblJlc3VsdC5lcnJvcnMubGVuZ3RoICE9IDApIHtcclxuXHRcdFx0XHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0LmVycm9ycztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cHJlcGFyZWRTZXF1ZW5jZXNbc2VxT2JqLklEXSA9IE9FSVNUb1NlcShzZXFPYmouSUQsIHNlcU9iai5pbnB1dFZhbHVlKTtcclxuXHRcdFx0fVxyXG5cdFx0XHRpZiAoc2VxT2JqLmlucHV0VHlwZSA9PSBcImxpc3RcIikge1xyXG5cdFx0XHRcdHZhbGlkYXRpb25SZXN1bHQgPSBWYWxpZGF0aW9uLmxpc3Qoc2VxT2JqKTtcclxuXHRcdFx0XHRpZiAodmFsaWRhdGlvblJlc3VsdC5lcnJvcnMubGVuZ3RoICE9IDApIHtcclxuXHRcdFx0XHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0LmVycm9ycztcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0cHJlcGFyZWRTZXF1ZW5jZXNbc2VxT2JqLklEXSA9IExpc3RUb1NlcShzZXFPYmouSUQsIHNlcU9iai5pbnB1dFZhbHVlKTtcclxuXHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKHNlcU9iai5pbnB1dFR5cGUgPT0gXCJjb2RlXCIpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwiTm90IGltcGxlbWVudGVkXCIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHVucHJvY2Vzc2VkU2VxdWVuY2VzW3NlcU9iai5JRF0gPSBzZXFPYmo7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdHJ1ZTtcclxuXHR9O1xyXG5cdC8qKlxyXG5cdCAqIFdlIGluaXRpYWxpemUgdGhlIGRyYXdpbmcgcHJvY2Vzc2luZy4gRmlyc3Qgd2UgY2FsY3VsYXRlIHRoZSBkaW1lbnNpb25zIG9mIGVhY2ggc2tldGNoXHJcblx0ICogdGhlbiB3ZSBwYWlyIHVwIHNlcXVlbmNlcyBhbmQgZHJhd2luZyBtb2R1bGVzLCBhbmQgZmluYWxseSB3ZSBwYXNzIHRoZW0gdG8gZ2VuZXJhdGVQNVxyXG5cdCAqIHdoaWNoIGFjdHVhbGx5IGluc3RhbnRpYXRlcyBkcmF3aW5nIG1vZHVsZXMgYW5kIGJlZ2lucyBkcmF3aW5nLlxyXG5cdCAqXHJcblx0ICogQHBhcmFtIHsqfSBzZXFWaXpQYWlycyBhIGxpc3Qgb2YgcGFpcnMgd2hlcmUgZWFjaCBwYWlyIGNvbnRhaW5zIGFuIElEIG9mIGEgc2VxdWVuY2VcclxuXHQgKiBhbmQgYW4gSUQgb2YgYSBkcmF3aW5nIHRvb2wsIHRoaXMgbGV0cyB1cyBrbm93IHRvIHBhc3Mgd2hpY2ggc2VxdWVuY2UgdG8gd2hpY2hcclxuXHQgKiBkcmF3aW5nIHRvb2wuXHJcblx0ICovXHJcblx0Y29uc3QgYmVnaW4gPSBmdW5jdGlvbiAoc2VxVml6UGFpcnMpIHtcclxuXHRcdGhpZGVMb2coKTtcclxuXHJcblx0XHQvL0ZpZ3VyaW5nIG91dCBsYXlvdXRcclxuXHRcdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHRcdGxldCB0b3RhbFdpZHRoID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NhbnZhc0FyZWEnKS5vZmZzZXRXaWR0aDtcclxuXHRcdGxldCB0b3RhbEhlaWdodCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYW52YXNBcmVhJykub2Zmc2V0SGVpZ2h0O1xyXG5cdFx0bGV0IGNhbnZhc0NvdW50ID0gc2VxVml6UGFpcnMubGVuZ3RoO1xyXG5cdFx0bGV0IGdyaWRTaXplID0gTWF0aC5jZWlsKE1hdGguc3FydChjYW52YXNDb3VudCkpO1xyXG5cdFx0bGV0IGluZGl2aWR1YWxXaWR0aCA9IHRvdGFsV2lkdGggLyBncmlkU2l6ZSAtIDIwO1xyXG5cdFx0bGV0IGluZGl2aWR1YWxIZWlnaHQgPSB0b3RhbEhlaWdodCAvIGdyaWRTaXplO1xyXG5cdFx0Ly8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRcdGZvciAobGV0IHBhaXIgb2Ygc2VxVml6UGFpcnMpIHtcclxuXHRcdFx0bGV0IGN1cnJlbnRTZXEgPSBwcmVwYXJlZFNlcXVlbmNlc1twYWlyLnNlcUlEXTtcclxuXHRcdFx0bGV0IGN1cnJlbnRUb29sID0gcHJlcGFyZWRUb29sc1twYWlyLnRvb2xJRF07XHJcblx0XHRcdGlmIChjdXJyZW50U2VxID09IHVuZGVmaW5lZCB8fCBjdXJyZW50VG9vbCA9PSB1bmRlZmluZWQpIHtcclxuXHRcdFx0XHRjb25zb2xlLmVycm9yKFwidW5kZWZpbmVkIElEIGZvciB0b29sIG9yIHNlcXVlbmNlXCIpO1xyXG5cdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdGxpdmVTa2V0Y2hlcy5wdXNoKGdlbmVyYXRlUDUoY3VycmVudFRvb2wubW9kdWxlLnZpeiwgY3VycmVudFRvb2wuY29uZmlnLCBjdXJyZW50U2VxLCBsaXZlU2tldGNoZXMubGVuZ3RoLCBpbmRpdmlkdWFsV2lkdGgsIGluZGl2aWR1YWxIZWlnaHQpKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdGNvbnN0IHNhdmVJbWFnZSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0bGl2ZVNrZXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKHNrZXRjaCkge1xyXG5cdFx0XHRza2V0Y2guc2F2ZUNhbnZhcyhcIkltYWdlXCIsIFwicG5nXCIpO1xyXG5cdFx0fSk7XHJcblx0fTtcclxuXHJcblx0Y29uc3QgbWFrZUpTT04gPSBmdW5jdGlvbiAoc2VxVml6UGFpcnMpIHtcclxuXHRcdGlmKCB1bnByb2Nlc3NlZFNlcXVlbmNlcy5sZW5ndGggPT0gMCAmJiB1bnByb2Nlc3NlZFRvb2xzLmxlbmd0aCA9PSAwICl7XHJcblx0XHRcdHJldHVybiBcIk5vdGhpbmcgdG8gc2F2ZSFcIjtcclxuXHRcdH1cclxuXHRcdHRvU2hvdyA9IFtdO1xyXG5cdFx0Zm9yIChsZXQgcGFpciBvZiBzZXFWaXpQYWlycykge1xyXG5cdFx0XHR0b1Nob3cucHVzaCh7XHJcblx0XHRcdFx0c2VxOiB1bnByb2Nlc3NlZFNlcXVlbmNlc1twYWlyLnNlcUlEXSxcclxuXHRcdFx0XHR0b29sOiB1bnByb2Nlc3NlZFRvb2xzW3BhaXIudG9vbElEXVxyXG5cdFx0XHR9KTtcclxuXHRcdH1cclxuXHRcdHJldHVybiBKU09OLnN0cmluZ2lmeSh0b1Nob3cpO1xyXG5cdH07XHJcblxyXG5cdGNvbnN0IGNsZWFyID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0c2hvd0xvZygpO1xyXG5cdFx0aWYgKGxpdmVTa2V0Y2hlcy5sZW5ndGggPT0gMCkge1xyXG5cdFx0XHRyZXR1cm47XHJcblx0XHR9IGVsc2Uge1xyXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGxpdmVTa2V0Y2hlcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdGxpdmVTa2V0Y2hlc1tpXS5yZW1vdmUoKTsgLy9kZWxldGUgY2FudmFzIGVsZW1lbnRcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH07XHJcblxyXG5cdGNvbnN0IHBhdXNlID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0bGl2ZVNrZXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKHNrZXRjaCkge1xyXG5cdFx0XHRza2V0Y2gubm9Mb29wKCk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRjb25zdCByZXN1bWUgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRsaXZlU2tldGNoZXMuZm9yRWFjaChmdW5jdGlvbiAoc2tldGNoKSB7XHJcblx0XHRcdHNrZXRjaC5sb29wKCk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRjb25zdCBzdGVwID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0bGl2ZVNrZXRjaGVzLmZvckVhY2goZnVuY3Rpb24gKHNrZXRjaCkge1xyXG5cdFx0XHRza2V0Y2gucmVkcmF3KCk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0cmVjZWl2ZVNlcXVlbmNlOiByZWNlaXZlU2VxdWVuY2UsXHJcblx0XHRyZWNlaXZlTW9kdWxlOiByZWNlaXZlTW9kdWxlLFxyXG5cdFx0bGl2ZVNrZXRjaGVzOiBsaXZlU2tldGNoZXMsXHJcblx0XHRwcmVwYXJlZFNlcXVlbmNlczogcHJlcGFyZWRTZXF1ZW5jZXMsXHJcblx0XHRwcmVwYXJlZFRvb2xzOiBwcmVwYXJlZFRvb2xzLFxyXG5cdFx0bW9kdWxlczogbW9kdWxlcyxcclxuXHRcdHZhbGlkT0VJUzogdmFsaWRPRUlTLFxyXG5cdFx0QnVpbHRJblNlcXM6IEJ1aWx0SW5TZXFzLFxyXG5cdFx0bWFrZUpTT046IG1ha2VKU09OLFxyXG5cdFx0YmVnaW46IGJlZ2luLFxyXG5cdFx0cGF1c2U6IHBhdXNlLFxyXG5cdFx0cmVzdW1lOiByZXN1bWUsXHJcblx0XHRzdGVwOiBzdGVwLFxyXG5cdFx0Y2xlYXI6IGNsZWFyLFxyXG5cdFx0c2F2ZUltYWdlOiBzYXZlSW1hZ2UsXHJcblx0fTtcclxufSgpO1xyXG5cclxuXHJcblxyXG5cclxuY29uc3QgTG9nUGFuZWwgPSBmdW5jdGlvbiAoKSB7XHJcblx0bG9nR3JlZW4gPSBmdW5jdGlvbiAobGluZSkge1xyXG5cdFx0JChcIiNpbm5lckxvZ0FyZWFcIikuYXBwZW5kKGA8cCBzdHlsZT1cImNvbG9yOiMwMGZmMDBcIj4ke2xpbmV9PC9wPjxicj5gKTtcclxuXHR9O1xyXG5cdGxvZ1JlZCA9IGZ1bmN0aW9uIChsaW5lKSB7XHJcblx0XHQkKFwiI2lubmVyTG9nQXJlYVwiKS5hcHBlbmQoYDxwIHN0eWxlPVwiY29sb3I6cmVkXCI+JHtsaW5lfTwvcD48YnI+YCk7XHJcblx0fTtcclxuXHRjbGVhcmxvZyA9IGZ1bmN0aW9uICgpIHtcclxuXHRcdCQoXCIjaW5uZXJMb2dBcmVhXCIpLmVtcHR5KCk7XHJcblx0fTtcclxuXHRoaWRlTG9nID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0JChcIiNsb2dBcmVhXCIpLmNzcygnZGlzcGxheScsICdub25lJyk7XHJcblx0fTtcclxuXHRzaG93TG9nID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0JChcIiNsb2dBcmVhXCIpLmNzcygnZGlzcGxheScsICdibG9jaycpO1xyXG5cdH07XHJcblx0cmV0dXJuIHtcclxuXHRcdGxvZ0dyZWVuOiBsb2dHcmVlbixcclxuXHRcdGxvZ1JlZDogbG9nUmVkLFxyXG5cdFx0Y2xlYXJsb2c6IGNsZWFybG9nLFxyXG5cdFx0aGlkZUxvZzogaGlkZUxvZyxcclxuXHRcdHNob3dMb2c6IHNob3dMb2csXHJcblx0fTtcclxufSgpO1xyXG53aW5kb3cuTlNjb3JlID0gTlNjb3JlO1xyXG53aW5kb3cuTG9nUGFuZWwgPSBMb2dQYW5lbDtcclxuIiwiU0VRVUVOQ0UgPSByZXF1aXJlKCcuL3NlcXVlbmNlcy9zZXF1ZW5jZXMuanMnKTtcclxuVkFMSURPRUlTID0gcmVxdWlyZSgnLi92YWxpZE9FSVMuanMnKTtcclxuTU9EVUxFUyA9IHJlcXVpcmUoJy4vbW9kdWxlcy9tb2R1bGVzLmpzJyk7XHJcblxyXG5cclxuY29uc3QgVmFsaWRhdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuXHJcblxyXG5cdGNvbnN0IGxpc3RFcnJvciA9IGZ1bmN0aW9uICh0aXRsZSkge1xyXG5cdFx0bGV0IG1zZyA9IFwiY2FuJ3QgcGFyc2UgdGhlIGxpc3QsIHBsZWFzZSBwYXNzIG51bWJlcnMgc2VwZXJhdGVkIGJ5IGNvbW1hcyAoZXhhbXBsZTogMSwyLDMpXCI7XHJcblx0XHRpZiAodGl0bGUgIT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdG1zZyA9IHRpdGxlICsgXCI6IFwiICsgbXNnO1xyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIG1zZztcclxuXHR9O1xyXG5cclxuXHRjb25zdCByZXF1aXJlZEVycm9yID0gZnVuY3Rpb24gKHRpdGxlKSB7XHJcblx0XHRyZXR1cm4gYCR7dGl0bGV9OiB0aGlzIGlzIGEgcmVxdWlyZWQgdmFsdWUsIGRvbid0IGxlYXZlIGl0IGVtcHR5IWA7XHJcblx0fTtcclxuXHJcblx0Y29uc3QgdHlwZUVycm9yID0gZnVuY3Rpb24gKHRpdGxlLCB2YWx1ZSwgZXhwZWN0ZWRUeXBlKSB7XHJcblx0XHRyZXR1cm4gYCR7dGl0bGV9OiAke3ZhbHVlfSBpcyBhICR7dHlwZW9mKHZhbHVlKX0sIGV4cGVjdGVkIGEgJHtleHBlY3RlZFR5cGV9LiBgO1xyXG5cdH07XHJcblxyXG5cdGNvbnN0IG9laXNFcnJvciA9IGZ1bmN0aW9uIChjb2RlKSB7XHJcblx0XHRyZXR1cm4gYCR7Y29kZX06IEVpdGhlciBhbiBpbnZhbGlkIE9FSVMgY29kZSBvciBub3QgZGVmaW5lZCBieSBzYWdlIWA7XHJcblx0fTtcclxuXHJcblx0Y29uc3QgYnVpbHRJbiA9IGZ1bmN0aW9uIChzZXFPYmopIHtcclxuXHRcdGxldCBzY2hlbWEgPSBTRVFVRU5DRS5CdWlsdEluU2Vxc1tzZXFPYmouaW5wdXRWYWx1ZV0ucGFyYW1zU2NoZW1hO1xyXG5cdFx0bGV0IHJlY2VpdmVkUGFyYW1zID0gc2VxT2JqLnBhcmFtZXRlcnM7XHJcblxyXG5cdFx0bGV0IHZhbGlkYXRpb25SZXN1bHQgPSB7XHJcblx0XHRcdHBhcnNlZEZpZWxkczoge30sXHJcblx0XHRcdGVycm9yczogW11cclxuXHRcdH07XHJcblx0XHRPYmplY3Qua2V5cyhyZWNlaXZlZFBhcmFtcykuZm9yRWFjaChcclxuXHRcdFx0KHBhcmFtZXRlcikgPT4ge1xyXG5cdFx0XHRcdHZhbGlkYXRlRnJvbVNjaGVtYShzY2hlbWEsIHBhcmFtZXRlciwgcmVjZWl2ZWRQYXJhbXNbcGFyYW1ldGVyXSwgdmFsaWRhdGlvblJlc3VsdCk7XHJcblx0XHRcdH1cclxuXHRcdCk7XHJcblx0XHRyZXR1cm4gdmFsaWRhdGlvblJlc3VsdDtcclxuXHR9O1xyXG5cclxuXHRjb25zdCBvZWlzID0gZnVuY3Rpb24gKHNlcU9iaikge1xyXG5cdFx0bGV0IHZhbGlkYXRpb25SZXN1bHQgPSB7XHJcblx0XHRcdHBhcnNlZEZpZWxkczoge30sXHJcblx0XHRcdGVycm9yczogW11cclxuXHRcdH07XHJcblx0XHRzZXFPYmouaW5wdXRWYWx1ZSA9IHNlcU9iai5pbnB1dFZhbHVlLnRyaW0oKTtcclxuXHRcdGxldCBvZWlzQ29kZSA9IHNlcU9iai5pbnB1dFZhbHVlO1xyXG5cdFx0aWYgKCFWQUxJRE9FSVMuaW5jbHVkZXMob2Vpc0NvZGUpKSB7XHJcblx0XHRcdHZhbGlkYXRpb25SZXN1bHQuZXJyb3JzLnB1c2gob2Vpc0Vycm9yKG9laXNDb2RlKSk7XHJcblx0XHR9XHJcblx0XHRyZXR1cm4gdmFsaWRhdGlvblJlc3VsdDtcclxuXHR9O1xyXG5cclxuXHRjb25zdCBsaXN0ID0gZnVuY3Rpb24gKHNlcU9iaikge1xyXG5cdFx0bGV0IHZhbGlkYXRpb25SZXN1bHQgPSB7XHJcblx0XHRcdHBhcnNlZEZpZWxkczoge30sXHJcblx0XHRcdGVycm9yczogW11cclxuXHRcdH07XHJcblx0XHR0cnkge1xyXG5cdFx0XHRpZiAodHlwZW9mIHNlcU9iai5pbnB1dFZhbHVlID09IFN0cmluZykgc2VxT2JqLmlucHV0VmFsdWUgPSBKU09OLnBhcnNlKHNlcU9iai5pbnB1dFZhbHVlKTtcclxuXHRcdH0gY2F0Y2ggKGVycikge1xyXG5cdFx0XHR2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5wdXNoKGxpc3RFcnJvcigpKTtcclxuXHRcdH1cclxuXHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0O1xyXG5cdH07XHJcblxyXG5cdGNvbnN0IF9tb2R1bGUgPSBmdW5jdGlvbiAobW9kdWxlT2JqKSB7XHJcblx0XHRsZXQgc2NoZW1hID0gTU9EVUxFU1ttb2R1bGVPYmoubW9kdWxlS2V5XS5jb25maWdTY2hlbWE7XHJcblx0XHRsZXQgcmVjZWl2ZWRDb25maWcgPSBtb2R1bGVPYmouY29uZmlnO1xyXG5cclxuXHRcdGxldCB2YWxpZGF0aW9uUmVzdWx0ID0ge1xyXG5cdFx0XHRwYXJzZWRGaWVsZHM6IHt9LFxyXG5cdFx0XHRlcnJvcnM6IFtdXHJcblx0XHR9O1xyXG5cclxuXHRcdE9iamVjdC5rZXlzKHJlY2VpdmVkQ29uZmlnKS5mb3JFYWNoKFxyXG5cdFx0XHQoY29uZmlnRmllbGQpID0+IHtcclxuXHRcdFx0XHR2YWxpZGF0ZUZyb21TY2hlbWEoc2NoZW1hLCBjb25maWdGaWVsZCwgcmVjZWl2ZWRDb25maWdbY29uZmlnRmllbGRdLCB2YWxpZGF0aW9uUmVzdWx0KTtcclxuXHRcdFx0fVxyXG5cdFx0KTtcclxuXHRcdHJldHVybiB2YWxpZGF0aW9uUmVzdWx0O1xyXG5cdH07XHJcblxyXG5cdGNvbnN0IHZhbGlkYXRlRnJvbVNjaGVtYSA9IGZ1bmN0aW9uIChzY2hlbWEsIGZpZWxkLCB2YWx1ZSwgdmFsaWRhdGlvblJlc3VsdCkge1xyXG5cdFx0bGV0IHRpdGxlID0gc2NoZW1hW2ZpZWxkXS50aXRsZTtcclxuXHRcdGlmICh0eXBlb2YgKHZhbHVlKSA9PSBcInN0cmluZ1wiKSB7XHJcblx0XHRcdHZhbHVlID0gdmFsdWUudHJpbSgpO1xyXG5cdFx0fVxyXG5cdFx0bGV0IGV4cGVjdGVkVHlwZSA9IHNjaGVtYVtmaWVsZF0udHlwZTtcclxuXHRcdGxldCByZXF1aXJlZCA9IChzY2hlbWFbZmllbGRdLnJlcXVpcmVkICE9PSB1bmRlZmluZWQpID8gc2NoZW1hW2ZpZWxkXS5yZXF1aXJlZCA6IGZhbHNlO1xyXG5cdFx0bGV0IGZvcm1hdCA9IChzY2hlbWFbZmllbGRdLmZvcm1hdCAhPT0gdW5kZWZpbmVkKSA/IHNjaGVtYVtmaWVsZF0uZm9ybWF0IDogZmFsc2U7XHJcblx0XHRsZXQgaXNFbXB0eSA9ICh2YWx1ZSA9PT0gJycpO1xyXG5cdFx0aWYgKHJlcXVpcmVkICYmIGlzRW1wdHkpIHtcclxuXHRcdFx0dmFsaWRhdGlvblJlc3VsdC5lcnJvcnMucHVzaChyZXF1aXJlZEVycm9yKHRpdGxlKSk7XHJcblx0XHR9XHJcblx0XHRpZiAoaXNFbXB0eSkge1xyXG5cdFx0XHRwYXJzZWQgPSAnJztcclxuXHRcdH1cclxuXHRcdGlmICghaXNFbXB0eSAmJiAoZXhwZWN0ZWRUeXBlID09IFwibnVtYmVyXCIpKSB7XHJcblx0XHRcdHBhcnNlZCA9IHBhcnNlSW50KHZhbHVlKTtcclxuXHRcdFx0aWYgKHBhcnNlZCAhPSBwYXJzZWQpIHsgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMzQyNjE5Mzgvd2hhdC1pcy10aGUtZGlmZmVyZW5jZS1iZXR3ZWVuLW5hbi1uYW4tYW5kLW5hbi1uYW5cclxuXHRcdFx0XHR2YWxpZGF0aW9uUmVzdWx0LmVycm9ycy5wdXNoKHR5cGVFcnJvcih0aXRsZSwgdmFsdWUsIGV4cGVjdGVkVHlwZSkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRpZiAoIWlzRW1wdHkgJiYgKGV4cGVjdGVkVHlwZSA9PSBcInN0cmluZ1wiKSkge1xyXG5cdFx0XHRwYXJzZWQgPSB2YWx1ZTtcclxuXHRcdH1cclxuXHRcdGlmICghaXNFbXB0eSAmJiAoZXhwZWN0ZWRUeXBlID09IFwiYm9vbGVhblwiKSkge1xyXG5cdFx0XHRpZiAodmFsdWUgPT0gJzEnKSB7XHJcblx0XHRcdFx0cGFyc2VkID0gdHJ1ZTtcclxuXHRcdFx0fSBlbHNlIHtcclxuXHRcdFx0XHRwYXJzZWQgPSBmYWxzZTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKGZvcm1hdCAmJiAoZm9ybWF0ID09IFwibGlzdFwiKSkge1xyXG5cdFx0XHR0cnkge1xyXG5cdFx0XHRcdHBhcnNlZCA9IEpTT04ucGFyc2UoXCJbXCIgKyB2YWx1ZSArIFwiXVwiKTtcclxuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRcdFx0dmFsaWRhdGlvblJlc3VsdC5lcnJvcnMucHVzaChsaXN0RXJyb3IodGl0bGUpKTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKHBhcnNlZCAhPT0gdW5kZWZpbmVkKSB7XHJcblx0XHRcdHZhbGlkYXRpb25SZXN1bHQucGFyc2VkRmllbGRzW2ZpZWxkXSA9IHBhcnNlZDtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRyZXR1cm4ge1xyXG5cdFx0YnVpbHRJbjogYnVpbHRJbixcclxuXHRcdG9laXM6IG9laXMsXHJcblx0XHRsaXN0OiBsaXN0LFxyXG5cdFx0bW9kdWxlOiBfbW9kdWxlXHJcblx0fTtcclxufSgpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBWYWxpZGF0aW9uOyIsIi8qXHJcbiAgICB2YXIgbGlzdD1bMiwgMywgNSwgNywgMTEsIDEzLCAxNywgMTksIDIzLCAyOSwgMzEsIDM3LCA0MSwgNDMsIDQ3LCA1MywgNTksIDYxLCA2NywgNzEsIDczLCA3OSwgODMsIDg5LCA5NywgMTAxLCAxMDMsIDEwNywgMTA5LCAxMTMsIDEyNywgMTMxLCAxMzcsIDEzOSwgMTQ5LCAxNTEsIDE1NywgMTYzLCAxNjcsIDE3MywgMTc5LCAxODEsIDE5MSwgMTkzLCAxOTcsIDE5OSwgMjExLCAyMjMsIDIyNywgMjI5LCAyMzMsIDIzOSwgMjQxLCAyNTEsIDI1NywgMjYzLCAyNjksIDI3MSwgMjc3LCAyODEsIDI4MywgMjkzLCAzMDcsIDMxMSwgMzEzLCAzMTcsIDMzMSwgMzM3LCAzNDcsIDM0OSwgMzUzLCAzNTksIDM2NywgMzczLCAzNzksIDM4MywgMzg5LCAzOTcsIDQwMSwgNDA5LCA0MTksIDQyMSwgNDMxLCA0MzMsIDQzOSwgNDQzLCA0NDksIDQ1NywgNDYxLCA0NjMsIDQ2NywgNDc5LCA0ODcsIDQ5MSwgNDk5LCA1MDMsIDUwOSwgNTIxLCA1MjMsIDU0MSwgNTQ3LCA1NTcsIDU2MywgNTY5LCA1NzEsIDU3NywgNTg3LCA1OTMsIDU5OSwgNjAxLCA2MDcsIDYxMywgNjE3LCA2MTksIDYzMSwgNjQxLCA2NDMsIDY0NywgNjUzLCA2NTksIDY2MSwgNjczLCA2NzcsIDY4MywgNjkxLCA3MDEsIDcwOSwgNzE5LCA3MjcsIDczMywgNzM5LCA3NDMsIDc1MSwgNzU3LCA3NjEsIDc2OSwgNzczLCA3ODcsIDc5NywgODA5LCA4MTEsIDgyMSwgODIzLCA4MjcsIDgyOSwgODM5LCA4NTMsIDg1NywgODU5LCA4NjMsIDg3NywgODgxLCA4ODMsIDg4NywgOTA3LCA5MTEsIDkxOSwgOTI5LCA5MzcsIDk0MSwgOTQ3LCA5NTMsIDk2NywgOTcxLCA5NzcsIDk4MywgOTkxLCA5OTcsIDEwMDksIDEwMTMsIDEwMTksIDEwMjEsIDEwMzEsIDEwMzMsIDEwMzksIDEwNDksIDEwNTEsIDEwNjEsIDEwNjMsIDEwNjksIDEwODcsIDEwOTEsIDEwOTMsIDEwOTcsIDExMDMsIDExMDksIDExMTcsIDExMjMsIDExMjksIDExNTEsIDExNTMsIDExNjMsIDExNzEsIDExODEsIDExODcsIDExOTMsIDEyMDEsIDEyMTMsIDEyMTcsIDEyMjNdO1xyXG5cclxuKi9cclxuXHJcbmNsYXNzIFZJWl9EaWZmZXJlbmNlcyB7XHJcblx0Y29uc3RydWN0b3Ioc2VxLCBza2V0Y2gsIGNvbmZpZykge1xyXG5cclxuXHRcdHRoaXMubiA9IGNvbmZpZy5uOyAvL24gaXMgbnVtYmVyIG9mIHRlcm1zIG9mIHRvcCBzZXF1ZW5jZVxyXG5cdFx0dGhpcy5sZXZlbHMgPSBjb25maWcuTGV2ZWxzOyAvL2xldmVscyBpcyBudW1iZXIgb2YgbGF5ZXJzIG9mIHRoZSBweXJhbWlkL3RyYXBlem9pZCBjcmVhdGVkIGJ5IHdyaXRpbmcgdGhlIGRpZmZlcmVuY2VzLlxyXG5cdFx0dGhpcy5zZXEgPSBzZXE7XHJcblx0XHR0aGlzLnNrZXRjaCA9IHNrZXRjaDtcclxuXHR9XHJcblxyXG5cdGRyYXdEaWZmZXJlbmNlcyhuLCBsZXZlbHMsIHNlcXVlbmNlKSB7XHJcblxyXG5cdFx0Ly9jaGFuZ2VkIGJhY2tncm91bmQgY29sb3IgdG8gZ3JleSBzaW5jZSB5b3UgY2FuJ3Qgc2VlIHdoYXQncyBnb2luZyBvblxyXG5cdFx0dGhpcy5za2V0Y2guYmFja2dyb3VuZCgnYmxhY2snKTtcclxuXHJcblx0XHRuID0gTWF0aC5taW4obiwgc2VxdWVuY2UubGVuZ3RoKTtcclxuXHRcdGxldmVscyA9IE1hdGgubWluKGxldmVscywgbiAtIDEpO1xyXG5cdFx0bGV0IGZvbnQsIGZvbnRTaXplID0gMjA7XHJcblx0XHR0aGlzLnNrZXRjaC50ZXh0Rm9udChcIkFyaWFsXCIpO1xyXG5cdFx0dGhpcy5za2V0Y2gudGV4dFNpemUoZm9udFNpemUpO1xyXG5cdFx0dGhpcy5za2V0Y2gudGV4dFN0eWxlKHRoaXMuc2tldGNoLkJPTEQpO1xyXG5cdFx0bGV0IHhEZWx0YSA9IDUwO1xyXG5cdFx0bGV0IHlEZWx0YSA9IDUwO1xyXG5cdFx0bGV0IGZpcnN0WCA9IDMwO1xyXG5cdFx0bGV0IGZpcnN0WSA9IDMwO1xyXG5cdFx0dGhpcy5za2V0Y2guY29sb3JNb2RlKHRoaXMuc2tldGNoLkhTQiwgMjU1KTtcclxuXHRcdGxldCBteUNvbG9yID0gdGhpcy5za2V0Y2guY29sb3IoMTAwLCAyNTUsIDE1MCk7XHJcblx0XHRsZXQgaHVlO1xyXG5cclxuXHRcdGxldCB3b3JraW5nU2VxdWVuY2UgPSBbXTtcclxuXHJcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMubjsgaSsrKSB7XHJcblx0XHRcdHdvcmtpbmdTZXF1ZW5jZS5wdXNoKHNlcXVlbmNlLmdldEVsZW1lbnQoaSkpOyAvL3dvcmtpbmdTZXF1ZW5jZSBjYW5uaWJhbGl6ZXMgZmlyc3QgbiBlbGVtZW50cyBvZiBzZXF1ZW5jZS5cclxuXHRcdH1cclxuXHJcblxyXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmxldmVsczsgaSsrKSB7XHJcblx0XHRcdGh1ZSA9IChpICogMjU1IC8gNikgJSAyNTU7XHJcblx0XHRcdG15Q29sb3IgPSB0aGlzLnNrZXRjaC5jb2xvcihodWUsIDE1MCwgMjAwKTtcclxuXHRcdFx0dGhpcy5za2V0Y2guZmlsbChteUNvbG9yKTtcclxuXHRcdFx0Zm9yIChsZXQgaiA9IDA7IGogPCB3b3JraW5nU2VxdWVuY2UubGVuZ3RoOyBqKyspIHtcclxuXHRcdFx0XHR0aGlzLnNrZXRjaC50ZXh0KHdvcmtpbmdTZXF1ZW5jZVtqXSwgZmlyc3RYICsgaiAqIHhEZWx0YSwgZmlyc3RZICsgaSAqIHlEZWx0YSk7IC8vRHJhd3MgYW5kIHVwZGF0ZXMgd29ya2luZ1NlcXVlbmNlIHNpbXVsdGFuZW91c2x5LlxyXG5cdFx0XHRcdGlmIChqIDwgd29ya2luZ1NlcXVlbmNlLmxlbmd0aCAtIDEpIHtcclxuXHRcdFx0XHRcdHdvcmtpbmdTZXF1ZW5jZVtqXSA9IHdvcmtpbmdTZXF1ZW5jZVtqICsgMV0gLSB3b3JraW5nU2VxdWVuY2Vbal07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHR3b3JraW5nU2VxdWVuY2UubGVuZ3RoID0gd29ya2luZ1NlcXVlbmNlLmxlbmd0aCAtIDE7IC8vUmVtb3ZlcyBsYXN0IGVsZW1lbnQuXHJcblx0XHRcdGZpcnN0WCA9IGZpcnN0WCArICgxIC8gMikgKiB4RGVsdGE7IC8vTW92ZXMgbGluZSBmb3J3YXJkIGhhbGYgZm9yIHB5cmFtaWQgc2hhcGUuXHJcblxyXG5cdFx0fVxyXG5cclxuXHR9XHJcblx0c2V0dXAoKSB7fVxyXG5cdGRyYXcoKSB7XHJcblx0XHR0aGlzLmRyYXdEaWZmZXJlbmNlcyh0aGlzLm4sIHRoaXMubGV2ZWxzLCB0aGlzLnNlcSk7XHJcblx0XHR0aGlzLnNrZXRjaC5ub0xvb3AoKTtcclxuXHR9XHJcbn1cclxuXHJcblxyXG5cclxuY29uc3QgU0NIRU1BX0RpZmZlcmVuY2VzID0ge1xyXG5cdG46IHtcclxuXHRcdHR5cGU6ICdudW1iZXInLFxyXG5cdFx0dGl0bGU6ICdOJyxcclxuXHRcdGRlc2NyaXB0aW9uOiAnTnVtYmVyIG9mIGVsZW1lbnRzJyxcclxuXHRcdHJlcXVpcmVkOiB0cnVlXHJcblx0fSxcclxuXHRMZXZlbHM6IHtcclxuXHRcdHR5cGU6ICdudW1iZXInLFxyXG5cdFx0dGl0bGU6ICdMZXZlbHMnLFxyXG5cdFx0ZGVzY3JpcHRpb246ICdOdW1iZXIgb2YgbGV2ZWxzJyxcclxuXHRcdHJlcXVpcmVkOiB0cnVlXHJcblx0fSxcclxufTtcclxuXHJcbmNvbnN0IE1PRFVMRV9EaWZmZXJlbmNlcyA9IHtcclxuXHR2aXo6IFZJWl9EaWZmZXJlbmNlcyxcclxuXHRuYW1lOiBcIkRpZmZlcmVuY2VzXCIsXHJcblx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0Y29uZmlnU2NoZW1hOiBTQ0hFTUFfRGlmZmVyZW5jZXNcclxufTtcclxuXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE1PRFVMRV9EaWZmZXJlbmNlczsiLCIvL0FuIGV4YW1wbGUgbW9kdWxlXHJcblxyXG5cclxuY2xhc3MgVklaX01vZEZpbGwge1xyXG5cdGNvbnN0cnVjdG9yKHNlcSwgc2tldGNoLCBjb25maWcpIHtcclxuXHRcdHRoaXMuc2tldGNoID0gc2tldGNoO1xyXG5cdFx0dGhpcy5zZXEgPSBzZXE7XHJcblx0XHR0aGlzLm1vZERpbWVuc2lvbiA9IGNvbmZpZy5tb2REaW1lbnNpb247XHJcblx0XHR0aGlzLmkgPSAwO1xyXG5cdH1cclxuXHJcblx0ZHJhd05ldyhudW0sIHNlcSkge1xyXG5cdFx0bGV0IGJsYWNrID0gdGhpcy5za2V0Y2guY29sb3IoMCk7XHJcblx0XHR0aGlzLnNrZXRjaC5maWxsKGJsYWNrKTtcclxuXHRcdGxldCBpO1xyXG5cdFx0bGV0IGo7XHJcblx0XHRmb3IgKGxldCBtb2QgPSAxOyBtb2QgPD0gdGhpcy5tb2REaW1lbnNpb247IG1vZCsrKSB7XHJcblx0XHRcdGkgPSBzZXEuZ2V0RWxlbWVudChudW0pICUgbW9kO1xyXG5cdFx0XHRqID0gbW9kIC0gMTtcclxuXHRcdFx0dGhpcy5za2V0Y2gucmVjdChqICogdGhpcy5yZWN0V2lkdGgsIHRoaXMuc2tldGNoLmhlaWdodCAtIChpICsgMSkgKiB0aGlzLnJlY3RIZWlnaHQsIHRoaXMucmVjdFdpZHRoLCB0aGlzLnJlY3RIZWlnaHQpO1xyXG5cdFx0fVxyXG5cclxuXHR9XHJcblxyXG5cdHNldHVwKCkge1xyXG5cdFx0dGhpcy5yZWN0V2lkdGggPSB0aGlzLnNrZXRjaC53aWR0aCAvIHRoaXMubW9kRGltZW5zaW9uO1xyXG5cdFx0dGhpcy5yZWN0SGVpZ2h0ID0gdGhpcy5za2V0Y2guaGVpZ2h0IC8gdGhpcy5tb2REaW1lbnNpb247XHJcblx0XHR0aGlzLnNrZXRjaC5ub1N0cm9rZSgpO1xyXG5cdH1cclxuXHJcblx0ZHJhdygpIHtcclxuXHRcdHRoaXMuZHJhd05ldyh0aGlzLmksIHRoaXMuc2VxKTtcclxuXHRcdHRoaXMuaSsrO1xyXG5cdFx0aWYgKGkgPT0gMTAwMCkge1xyXG5cdFx0XHR0aGlzLnNrZXRjaC5ub0xvb3AoKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG59XHJcblxyXG5jb25zdCBTQ0hFTUFfTW9kRmlsbCA9IHtcclxuXHRtb2REaW1lbnNpb246IHtcclxuXHRcdHR5cGU6IFwibnVtYmVyXCIsXHJcblx0XHR0aXRsZTogXCJNb2QgZGltZW5zaW9uXCIsXHJcblx0XHRkZXNjcmlwdGlvbjogXCJcIixcclxuXHRcdHJlcXVpcmVkOiB0cnVlXHJcblx0fVxyXG59O1xyXG5cclxuXHJcbmNvbnN0IE1PRFVMRV9Nb2RGaWxsID0ge1xyXG5cdHZpejogVklaX01vZEZpbGwsXHJcblx0bmFtZTogXCJNb2QgRmlsbFwiLFxyXG5cdGRlc2NyaXB0aW9uOiBcIlwiLFxyXG5cdGNvbmZpZ1NjaGVtYTogU0NIRU1BX01vZEZpbGxcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTU9EVUxFX01vZEZpbGw7IiwiY2xhc3MgVklaX3NoaWZ0Q29tcGFyZSB7XHJcblx0Y29uc3RydWN0b3Ioc2VxLCBza2V0Y2gsIGNvbmZpZykge1xyXG5cdFx0Ly9Ta2V0Y2ggaXMgeW91ciBjYW52YXNcclxuXHRcdC8vY29uZmlnIGlzIHRoZSBwYXJhbWV0ZXJzIHlvdSBleHBlY3RcclxuXHRcdC8vc2VxIGlzIHRoZSBzZXF1ZW5jZSB5b3UgYXJlIGRyYXdpbmdcclxuXHRcdHRoaXMuc2tldGNoID0gc2tldGNoO1xyXG5cdFx0dGhpcy5zZXEgPSBzZXE7XHJcblx0XHR0aGlzLk1PRCA9IDI7XHJcblx0XHQvLyBTZXQgdXAgdGhlIGltYWdlIG9uY2UuXHJcblx0fVxyXG5cclxuXHJcblx0c2V0dXAoKSB7XHJcblx0XHRjb25zb2xlLmxvZyh0aGlzLnNrZXRjaC5oZWlnaHQsIHRoaXMuc2tldGNoLndpZHRoKTtcclxuXHRcdHRoaXMuaW1nID0gdGhpcy5za2V0Y2guY3JlYXRlSW1hZ2UodGhpcy5za2V0Y2gud2lkdGgsIHRoaXMuc2tldGNoLmhlaWdodCk7XHJcblx0XHR0aGlzLmltZy5sb2FkUGl4ZWxzKCk7IC8vIEVuYWJsZXMgcGl4ZWwtbGV2ZWwgZWRpdGluZy5cclxuXHR9XHJcblxyXG5cdGNsaXAoYSwgbWluLCBtYXgpIHtcclxuXHRcdGlmIChhIDwgbWluKSB7XHJcblx0XHRcdHJldHVybiBtaW47XHJcblx0XHR9IGVsc2UgaWYgKGEgPiBtYXgpIHtcclxuXHRcdFx0cmV0dXJuIG1heDtcclxuXHRcdH1cclxuXHRcdHJldHVybiBhO1xyXG5cdH1cclxuXHJcblxyXG5cdGRyYXcoKSB7IC8vVGhpcyB3aWxsIGJlIGNhbGxlZCBldmVyeXRpbWUgdG8gZHJhd1xyXG5cdFx0Ly8gRW5zdXJlIG1vdXNlIGNvb3JkaW5hdGVzIGFyZSBzYW5lLlxyXG5cdFx0Ly8gTW91c2UgY29vcmRpbmF0ZXMgbG9vayB0aGV5J3JlIGZsb2F0cyBieSBkZWZhdWx0LlxyXG5cclxuXHRcdGxldCBkID0gdGhpcy5za2V0Y2gucGl4ZWxEZW5zaXR5KCk7XHJcblx0XHRsZXQgbXggPSB0aGlzLmNsaXAoTWF0aC5yb3VuZCh0aGlzLnNrZXRjaC5tb3VzZVgpLCAwLCB0aGlzLnNrZXRjaC53aWR0aCk7XHJcblx0XHRsZXQgbXkgPSB0aGlzLmNsaXAoTWF0aC5yb3VuZCh0aGlzLnNrZXRjaC5tb3VzZVkpLCAwLCB0aGlzLnNrZXRjaC5oZWlnaHQpO1xyXG5cdFx0aWYgKHRoaXMuc2tldGNoLmtleSA9PSAnQXJyb3dVcCcpIHtcclxuXHRcdFx0dGhpcy5NT0QgKz0gMTtcclxuXHRcdFx0dGhpcy5za2V0Y2gua2V5ID0gbnVsbDtcclxuXHRcdFx0Y29uc29sZS5sb2coXCJVUCBQUkVTU0VELCBORVcgTU9EOiBcIiArIHRoaXMuTU9EKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5za2V0Y2gua2V5ID09ICdBcnJvd0Rvd24nKSB7XHJcblx0XHRcdHRoaXMuTU9EIC09IDE7XHJcblx0XHRcdHRoaXMuc2tldGNoLmtleSA9IG51bGw7XHJcblx0XHRcdGNvbnNvbGUubG9nKFwiRE9XTiBQUkVTU0VELCBORVcgTU9EOiBcIiArIHRoaXMuTU9EKTtcclxuXHRcdH0gZWxzZSBpZiAodGhpcy5za2V0Y2gua2V5ID09ICdBcnJvd1JpZ2h0Jykge1xyXG5cdFx0XHRjb25zb2xlLmxvZyhjb25zb2xlLmxvZyhcIk1YOiBcIiArIG14ICsgXCIgTVk6IFwiICsgbXkpKTtcclxuXHRcdH1cclxuXHRcdC8vIFdyaXRlIHRvIGltYWdlLCB0aGVuIHRvIHNjcmVlbiBmb3Igc3BlZWQuXHJcblx0XHRmb3IgKGxldCB4ID0gMDsgeCA8IHRoaXMuc2tldGNoLndpZHRoOyB4KyspIHtcclxuXHRcdFx0Zm9yIChsZXQgeSA9IDA7IHkgPCB0aGlzLnNrZXRjaC5oZWlnaHQ7IHkrKykge1xyXG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgZDsgaSsrKSB7XHJcblx0XHRcdFx0XHRmb3IgKGxldCBqID0gMDsgaiA8IGQ7IGorKykge1xyXG5cdFx0XHRcdFx0XHRsZXQgaW5kZXggPSA0ICogKCh5ICogZCArIGopICogdGhpcy5za2V0Y2gud2lkdGggKiBkICsgKHggKiBkICsgaSkpO1xyXG5cdFx0XHRcdFx0XHRpZiAodGhpcy5zZXEuZ2V0RWxlbWVudCh4KSAlICh0aGlzLk1PRCkgPT0gdGhpcy5zZXEuZ2V0RWxlbWVudCh5KSAlICh0aGlzLk1PRCkpIHtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmltZy5waXhlbHNbaW5kZXhdID0gMjU1O1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleCArIDFdID0gMjU1O1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleCArIDJdID0gMjU1O1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleCArIDNdID0gMjU1O1xyXG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleF0gPSAwO1xyXG5cdFx0XHRcdFx0XHRcdHRoaXMuaW1nLnBpeGVsc1tpbmRleCArIDFdID0gMDtcclxuXHRcdFx0XHRcdFx0XHR0aGlzLmltZy5waXhlbHNbaW5kZXggKyAyXSA9IDA7XHJcblx0XHRcdFx0XHRcdFx0dGhpcy5pbWcucGl4ZWxzW2luZGV4ICsgM10gPSAyNTU7XHJcblx0XHRcdFx0XHRcdH1cclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHJcblx0XHR0aGlzLmltZy51cGRhdGVQaXhlbHMoKTsgLy8gQ29waWVzIG91ciBlZGl0ZWQgcGl4ZWxzIHRvIHRoZSBpbWFnZS5cclxuXHJcblx0XHR0aGlzLnNrZXRjaC5pbWFnZSh0aGlzLmltZywgMCwgMCk7IC8vIERpc3BsYXkgaW1hZ2UgdG8gc2NyZWVuLnRoaXMuc2tldGNoLmxpbmUoNTAsNTAsMTAwLDEwMCk7XHJcblx0fVxyXG59XHJcblxyXG5cclxuY29uc3QgTU9EVUxFX1NoaWZ0Q29tcGFyZSA9IHtcclxuXHR2aXo6IFZJWl9zaGlmdENvbXBhcmUsXHJcblx0bmFtZTogXCJTaGlmdCBDb21wYXJlXCIsXHJcblx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0Y29uZmlnU2NoZW1hOiB7fVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNT0RVTEVfU2hpZnRDb21wYXJlOyIsImNsYXNzIFZJWl9UdXJ0bGUge1xyXG5cdGNvbnN0cnVjdG9yKHNlcSwgc2tldGNoLCBjb25maWcpIHtcclxuXHRcdHZhciBkb21haW4gPSBjb25maWcuZG9tYWluO1xyXG5cdFx0dmFyIHJhbmdlID0gY29uZmlnLnJhbmdlO1xyXG5cdFx0dGhpcy5yb3RNYXAgPSB7fTtcclxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgZG9tYWluLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRoaXMucm90TWFwW2RvbWFpbltpXV0gPSAoTWF0aC5QSSAvIDE4MCkgKiByYW5nZVtpXTtcclxuXHRcdH1cclxuXHRcdHRoaXMuc3RlcFNpemUgPSBjb25maWcuc3RlcFNpemU7XHJcblx0XHR0aGlzLmJnQ29sb3IgPSBjb25maWcuYmdDb2xvcjtcclxuXHRcdHRoaXMuc3Ryb2tlQ29sb3IgPSBjb25maWcuc3Ryb2tlQ29sb3I7XHJcblx0XHR0aGlzLnN0cm9rZVdpZHRoID0gY29uZmlnLnN0cm9rZVdlaWdodDtcclxuXHRcdHRoaXMuc2VxID0gc2VxO1xyXG5cdFx0dGhpcy5jdXJyZW50SW5kZXggPSAwO1xyXG5cdFx0dGhpcy5vcmllbnRhdGlvbiA9IDA7XHJcblx0XHR0aGlzLnNrZXRjaCA9IHNrZXRjaDtcclxuXHRcdGlmIChjb25maWcuc3RhcnRpbmdYICE9IFwiXCIpIHtcclxuXHRcdFx0dGhpcy5YID0gY29uZmlnLnN0YXJ0aW5nWDtcclxuXHRcdFx0dGhpcy5ZID0gY29uZmlnLnN0YXJ0aW5nWTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMuWCA9IG51bGw7XHJcblx0XHRcdHRoaXMuWSA9IG51bGw7XHJcblx0XHR9XHJcblx0fVxyXG5cclxuXHRzdGVwRHJhdygpIHtcclxuXHRcdGxldCBvbGRYID0gdGhpcy5YO1xyXG5cdFx0bGV0IG9sZFkgPSB0aGlzLlk7XHJcblx0XHRsZXQgY3VyckVsZW1lbnQgPSB0aGlzLnNlcS5nZXRFbGVtZW50KHRoaXMuY3VycmVudEluZGV4KyspO1xyXG5cdFx0bGV0IGFuZ2xlID0gdGhpcy5yb3RNYXBbY3VyckVsZW1lbnRdO1xyXG5cdFx0aWYgKGFuZ2xlID09IHVuZGVmaW5lZCkge1xyXG5cdFx0XHR0aHJvdyAoJ2FuZ2xlIHVuZGVmaW5lZCBmb3IgZWxlbWVudDogJyArIGN1cnJFbGVtZW50KTtcclxuXHRcdH1cclxuXHRcdHRoaXMub3JpZW50YXRpb24gPSAodGhpcy5vcmllbnRhdGlvbiArIGFuZ2xlKTtcclxuXHRcdHRoaXMuWCArPSB0aGlzLnN0ZXBTaXplICogTWF0aC5jb3ModGhpcy5vcmllbnRhdGlvbik7XHJcblx0XHR0aGlzLlkgKz0gdGhpcy5zdGVwU2l6ZSAqIE1hdGguc2luKHRoaXMub3JpZW50YXRpb24pO1xyXG5cdFx0dGhpcy5za2V0Y2gubGluZShvbGRYLCBvbGRZLCB0aGlzLlgsIHRoaXMuWSk7XHJcblx0fVxyXG5cdHNldHVwKCkge1xyXG5cdFx0dGhpcy5YID0gdGhpcy5za2V0Y2gud2lkdGggLyAyO1xyXG5cdFx0dGhpcy5ZID0gdGhpcy5za2V0Y2guaGVpZ2h0IC8gMjtcclxuXHRcdHRoaXMuc2tldGNoLmJhY2tncm91bmQodGhpcy5iZ0NvbG9yKTtcclxuXHRcdHRoaXMuc2tldGNoLnN0cm9rZSh0aGlzLnN0cm9rZUNvbG9yKTtcclxuXHRcdHRoaXMuc2tldGNoLnN0cm9rZVdlaWdodCh0aGlzLnN0cm9rZVdpZHRoKTtcclxuXHR9XHJcblx0ZHJhdygpIHtcclxuXHRcdHRoaXMuc3RlcERyYXcoKTtcclxuXHR9XHJcbn1cclxuXHJcblxyXG5jb25zdCBTQ0hFTUFfVHVydGxlID0ge1xyXG5cdGRvbWFpbjoge1xyXG5cdFx0dHlwZTogJ3N0cmluZycsXHJcblx0XHR0aXRsZTogJ1NlcXVlbmNlIERvbWFpbicsXHJcblx0XHRkZXNjcmlwdGlvbjogJ0NvbW1hIHNlcGVyYXRlZCBudW1iZXJzJyxcclxuXHRcdGZvcm1hdDogJ2xpc3QnLFxyXG5cdFx0ZGVmYXVsdDogXCIwLDEsMiwzLDRcIixcclxuXHRcdHJlcXVpcmVkOiB0cnVlXHJcblx0fSxcclxuXHRyYW5nZToge1xyXG5cdFx0dHlwZTogJ3N0cmluZycsXHJcblx0XHR0aXRsZTogJ0FuZ2xlcycsXHJcblx0XHRkZWZhdWx0OiBcIjMwLDQ1LDYwLDkwLDEyMFwiLFxyXG5cdFx0Zm9ybWF0OiAnbGlzdCcsXHJcblx0XHRkZXNjcmlwdGlvbjogJ0NvbW1hIHNlcGVyYXRlZCBudW1iZXJzJyxcclxuXHRcdHJlcXVpcmVkOiB0cnVlXHJcblx0fSxcclxuXHRzdGVwU2l6ZToge1xyXG5cdFx0dHlwZTogJ251bWJlcicsXHJcblx0XHR0aXRsZTogJ1N0ZXAgU2l6ZScsXHJcblx0XHRkZWZhdWx0OiAyMCxcclxuXHRcdHJlcXVpcmVkOiB0cnVlXHJcblx0fSxcclxuXHRzdHJva2VXZWlnaHQ6IHtcclxuXHRcdHR5cGU6ICdudW1iZXInLFxyXG5cdFx0dGl0bGU6ICdTdHJva2UgV2lkdGgnLFxyXG5cdFx0ZGVmYXVsdDogNSxcclxuXHRcdHJlcXVpcmVkOiB0cnVlXHJcblx0fSxcclxuXHRzdGFydGluZ1g6IHtcclxuXHRcdHR5cGU6ICdudW1iZXInLFxyXG5cdFx0dGl0ZTogJ1ggc3RhcnQnXHJcblx0fSxcclxuXHRzdGFydGluZ1k6IHtcclxuXHRcdHR5cGU6ICdudW1iZXInLFxyXG5cdFx0dGl0ZTogJ1kgc3RhcnQnXHJcblx0fSxcclxuXHRiZ0NvbG9yOiB7XHJcblx0XHR0eXBlOiAnc3RyaW5nJyxcclxuXHRcdHRpdGxlOiAnQmFja2dyb3VuZCBDb2xvcicsXHJcblx0XHRmb3JtYXQ6ICdjb2xvcicsXHJcblx0XHRkZWZhdWx0OiBcIiM2NjY2NjZcIixcclxuXHRcdHJlcXVpcmVkOiBmYWxzZVxyXG5cdH0sXHJcblx0c3Ryb2tlQ29sb3I6IHtcclxuXHRcdHR5cGU6ICdzdHJpbmcnLFxyXG5cdFx0dGl0bGU6ICdTdHJva2UgQ29sb3InLFxyXG5cdFx0Zm9ybWF0OiAnY29sb3InLFxyXG5cdFx0ZGVmYXVsdDogJyNmZjAwMDAnLFxyXG5cdFx0cmVxdWlyZWQ6IGZhbHNlXHJcblx0fSxcclxufTtcclxuXHJcbmNvbnN0IE1PRFVMRV9UdXJ0bGUgPSB7XHJcblx0dml6OiBWSVpfVHVydGxlLFxyXG5cdG5hbWU6IFwiVHVydGxlXCIsXHJcblx0ZGVzY3JpcHRpb246IFwiXCIsXHJcblx0Y29uZmlnU2NoZW1hOiBTQ0hFTUFfVHVydGxlXHJcbn07XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBNT0RVTEVfVHVydGxlO1xyXG4iLCIvL0FkZCBhbiBpbXBvcnQgbGluZSBoZXJlIGZvciBuZXcgbW9kdWxlc1xyXG5cclxuXHJcbi8vQWRkIG5ldyBtb2R1bGVzIHRvIHRoaXMgY29uc3RhbnQuXHJcbmNvbnN0IE1PRFVMRVMgPSB7fTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gTU9EVUxFUztcclxuXHJcbi8qanNoaW50IGlnbm9yZTpzdGFydCAqL1xyXG5NT0RVTEVTW1wiVHVydGxlXCJdID0gcmVxdWlyZSgnLi9tb2R1bGVUdXJ0bGUuanMnKTtcclxuTU9EVUxFU1tcIlNoaWZ0Q29tcGFyZVwiXSA9IHJlcXVpcmUoJy4vbW9kdWxlU2hpZnRDb21wYXJlLmpzJyk7XHJcbk1PRFVMRVNbXCJEaWZmZXJlbmNlc1wiXSA9IHJlcXVpcmUoJy4vbW9kdWxlRGlmZmVyZW5jZXMuanMnKTtcclxuTU9EVUxFU1tcIk1vZEZpbGxcIl0gPSByZXF1aXJlKCcuL21vZHVsZU1vZEZpbGwuanMnKTtcclxuLy9NT0RVTEVTWydIYW5naW5nR2FyZGVucyddID0gcmVxdWlyZSgnLi9tb2R1bGVIYW5naW5nR2FyZGVucy5qcycpXHJcbi8vTU9EVUxFU1snUHJvcGVydHlCbG9ja3MnXSA9IHJlcXVpcmUoJy4vbW9kdWxlUHJvcGVydHlCbG9ja3MuanMnKVxyXG4vL01PRFVMRVNbJ09wYWNpdHlTcGlyYWwnXSA9IHJlcXVpcmUoJy4vbW9kdWxlT3BhY2l0eVNwaXJhbC5qcycpXHJcbiIsIlNFUV9saW5lYXJSZWN1cnJlbmNlID0gcmVxdWlyZSgnLi9zZXF1ZW5jZUxpblJlYy5qcycpO1xyXG5cclxuZnVuY3Rpb24gR0VOX2ZpYm9uYWNjaSh7XHJcbiAgICBtXHJcbn0pIHtcclxuICAgIHJldHVybiBTRVFfbGluZWFyUmVjdXJyZW5jZS5nZW5lcmF0b3Ioe1xyXG4gICAgICAgIGNvZWZmaWNpZW50TGlzdDogWzEsIDFdLFxyXG4gICAgICAgIHNlZWRMaXN0OiBbMSwgMV0sXHJcbiAgICAgICAgbVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmNvbnN0IFNDSEVNQV9GaWJvbmFjY2kgPSB7XHJcbiAgICBtOiB7XHJcbiAgICAgICAgdHlwZTogJ251bWJlcicsXHJcbiAgICAgICAgdGl0bGU6ICdNb2QnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQSBudW1iZXIgdG8gbW9kIHRoZSBzZXF1ZW5jZSBieSBieScsXHJcbiAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuY29uc3QgU0VRX2ZpYm9uYWNjaSA9IHtcclxuICAgIGdlbmVyYXRvcjogR0VOX2ZpYm9uYWNjaSxcclxuICAgIG5hbWU6IFwiRmlib25hY2NpXCIsXHJcbiAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgIHBhcmFtc1NjaGVtYTogU0NIRU1BX0ZpYm9uYWNjaVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTRVFfZmlib25hY2NpOyIsImZ1bmN0aW9uIEdFTl9saW5lYXJSZWN1cnJlbmNlKHtcclxuICAgIGNvZWZmaWNpZW50TGlzdCxcclxuICAgIHNlZWRMaXN0LFxyXG4gICAgbVxyXG59KSB7XHJcbiAgICBpZiAoY29lZmZpY2llbnRMaXN0Lmxlbmd0aCAhPSBzZWVkTGlzdC5sZW5ndGgpIHtcclxuICAgICAgICAvL051bWJlciBvZiBzZWVkcyBzaG91bGQgbWF0Y2ggdGhlIG51bWJlciBvZiBjb2VmZmljaWVudHNcclxuICAgICAgICBjb25zb2xlLmxvZyhcIm51bWJlciBvZiBjb2VmZmljaWVudHMgbm90IGVxdWFsIHRvIG51bWJlciBvZiBzZWVkcyBcIik7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBsZXQgayA9IGNvZWZmaWNpZW50TGlzdC5sZW5ndGg7XHJcbiAgICBsZXQgZ2VuZXJpY0xpblJlYztcclxuICAgIGlmIChtICE9IG51bGwpIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvZWZmaWNpZW50TGlzdC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBjb2VmZmljaWVudExpc3RbaV0gPSBjb2VmZmljaWVudExpc3RbaV0gJSBtO1xyXG4gICAgICAgICAgICBzZWVkTGlzdFtpXSA9IHNlZWRMaXN0W2ldICUgbTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2VuZXJpY0xpblJlYyA9IGZ1bmN0aW9uIChuLCBjYWNoZSkge1xyXG4gICAgICAgICAgICBpZiAobiA8IHNlZWRMaXN0Lmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY2FjaGVbbl0gPSBzZWVkTGlzdFtuXTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBjYWNoZVtuXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FjaGUubGVuZ3RoOyBpIDw9IG47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGs7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBjYWNoZVtpIC0gaiAtIDFdICogY29lZmZpY2llbnRMaXN0W2pdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FjaGVbaV0gPSBzdW0gJSBtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBjYWNoZVtuXTtcclxuICAgICAgICB9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBnZW5lcmljTGluUmVjID0gZnVuY3Rpb24gKG4sIGNhY2hlKSB7XHJcbiAgICAgICAgICAgIGlmIChuIDwgc2VlZExpc3QubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICBjYWNoZVtuXSA9IHNlZWRMaXN0W25dO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhY2hlW25dO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gY2FjaGUubGVuZ3RoOyBpIDw9IG47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1bSA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IGs7IGorKykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN1bSArPSBjYWNoZVtpIC0gaiAtIDFdICogY29lZmZpY2llbnRMaXN0W2pdO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2FjaGVbaV0gPSBzdW07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlW25dO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbiAgICByZXR1cm4gZ2VuZXJpY0xpblJlYztcclxufVxyXG5cclxuY29uc3QgU0NIRU1BX2xpbmVhclJlY3VycmVuY2UgPSB7XHJcbiAgICBjb2VmZmljaWVudExpc3Q6IHtcclxuICAgICAgICB0eXBlOiAnc3RyaW5nJyxcclxuICAgICAgICB0aXRsZTogJ0NvZWZmaWNpZW50cyBsaXN0JyxcclxuICAgICAgICBmb3JtYXQ6ICdsaXN0JyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0NvbW1hIHNlcGVyYXRlZCBudW1iZXJzJyxcclxuICAgICAgICByZXF1aXJlZDogdHJ1ZVxyXG4gICAgfSxcclxuICAgIHNlZWRMaXN0OiB7XHJcbiAgICAgICAgdHlwZTogJ3N0cmluZycsXHJcbiAgICAgICAgdGl0bGU6ICdTZWVkIGxpc3QnLFxyXG4gICAgICAgIGZvcm1hdDogJ2xpc3QnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQ29tbWEgc2VwZXJhdGVkIG51bWJlcnMnLFxyXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgbToge1xyXG4gICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgIHRpdGxlOiAnTW9kJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0EgbnVtYmVyIHRvIG1vZCB0aGUgc2VxdWVuY2UgYnkgYnknLFxyXG4gICAgICAgIHJlcXVpcmVkOiBmYWxzZVxyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmNvbnN0IFNFUV9saW5lYXJSZWN1cnJlbmNlID0ge1xyXG4gICAgZ2VuZXJhdG9yOiBHRU5fbGluZWFyUmVjdXJyZW5jZSxcclxuICAgIG5hbWU6IFwiTGluZWFyIFJlY3VycmVuY2VcIixcclxuICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgcGFyYW1zU2NoZW1hOiBTQ0hFTUFfbGluZWFyUmVjdXJyZW5jZVxyXG59O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBTRVFfbGluZWFyUmVjdXJyZW5jZTsiLCJjb25zdCBTRVFfbGluZWFyUmVjdXJyZW5jZSA9IHJlcXVpcmUoJy4vc2VxdWVuY2VMaW5SZWMuanMnKTtcclxuXHJcbmZ1bmN0aW9uIEdFTl9MdWNhcyh7XHJcbiAgICBtXHJcbn0pIHtcclxuICAgIHJldHVybiBTRVFfbGluZWFyUmVjdXJyZW5jZS5nZW5lcmF0b3Ioe1xyXG4gICAgICAgIGNvZWZmaWNpZW50TGlzdDogWzEsIDFdLFxyXG4gICAgICAgIHNlZWRMaXN0OiBbMiwgMV0sXHJcbiAgICAgICAgbVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbmNvbnN0IFNDSEVNQV9MdWNhcyA9IHtcclxuICAgIG06IHtcclxuICAgICAgICB0eXBlOiAnbnVtYmVyJyxcclxuICAgICAgICB0aXRsZTogJ01vZCcsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdBIG51bWJlciB0byBtb2QgdGhlIHNlcXVlbmNlIGJ5IGJ5JyxcclxuICAgICAgICByZXF1aXJlZDogZmFsc2VcclxuICAgIH1cclxufTtcclxuXHJcblxyXG5jb25zdCBTRVFfTHVjYXMgPSB7XHJcbiAgICBnZW5lcmF0b3I6IEdFTl9MdWNhcyxcclxuICAgIG5hbWU6IFwiTHVjYXNcIixcclxuICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxyXG4gICAgcGFyYW1zU2NoZW1hOiBTQ0hFTUFfTHVjYXNcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU0VRX0x1Y2FzOyIsImZ1bmN0aW9uIEdFTl9OYXR1cmFscyh7XHJcbiAgICBpbmNsdWRlemVyb1xyXG59KSB7XHJcbiAgICBpZiAoaW5jbHVkZXplcm8pIHtcclxuICAgICAgICByZXR1cm4gKChuKSA9PiBuKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuICgobikgPT4gbiArIDEpO1xyXG4gICAgfVxyXG59XHJcblxyXG5jb25zdCBTQ0hFTUFfTmF0dXJhbHMgPSB7XHJcbiAgICBpbmNsdWRlemVybzoge1xyXG4gICAgICAgIHR5cGU6ICdib29sZWFuJyxcclxuICAgICAgICB0aXRsZTogJ0luY2x1ZGUgemVybycsXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICcnLFxyXG4gICAgICAgIGRlZmF1bHQ6ICdmYWxzZScsXHJcbiAgICAgICAgcmVxdWlyZWQ6IGZhbHNlXHJcbiAgICB9XHJcbn07XHJcblxyXG5cclxuY29uc3QgU0VRX05hdHVyYWxzID0ge1xyXG4gICAgZ2VuZXJhdG9yOiBHRU5fTmF0dXJhbHMsXHJcbiAgICBuYW1lOiBcIk5hdHVyYWxzXCIsXHJcbiAgICBkZXNjcmlwdGlvbjogXCJcIixcclxuICAgIHBhcmFtc1NjaGVtYTogU0NIRU1BX05hdHVyYWxzXHJcbn07XHJcblxyXG4vLyBleHBvcnQgZGVmYXVsdCBTRVFfTmF0dXJhbHNcclxubW9kdWxlLmV4cG9ydHMgPSBTRVFfTmF0dXJhbHM7IiwiZnVuY3Rpb24gR0VOX1ByaW1lcygpIHtcclxuICAgIGNvbnN0IHByaW1lcyA9IGZ1bmN0aW9uIChuLCBjYWNoZSkge1xyXG4gICAgICAgIGlmIChjYWNoZS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICBjYWNoZS5wdXNoKDIpO1xyXG4gICAgICAgICAgICBjYWNoZS5wdXNoKDMpO1xyXG4gICAgICAgICAgICBjYWNoZS5wdXNoKDUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsZXQgaSA9IGNhY2hlW2NhY2hlLmxlbmd0aCAtIDFdICsgMTtcclxuICAgICAgICBsZXQgayA9IDA7XHJcbiAgICAgICAgd2hpbGUgKGNhY2hlLmxlbmd0aCA8PSBuKSB7XHJcbiAgICAgICAgICAgIGxldCBpc1ByaW1lID0gdHJ1ZTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBjYWNoZS5sZW5ndGg7IGorKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgJSBjYWNoZVtqXSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXNQcmltZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpc1ByaW1lKSB7XHJcbiAgICAgICAgICAgICAgICBjYWNoZS5wdXNoKGkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGkrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGNhY2hlW25dO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBwcmltZXM7XHJcbn1cclxuXHJcblxyXG5jb25zdCBTQ0hFTUFfUHJpbWVzID0ge1xyXG4gICAgbToge1xyXG4gICAgICAgIHR5cGU6ICdudW1iZXInLFxyXG4gICAgICAgIHRpdGxlOiAnTW9kJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0EgbnVtYmVyIHRvIG1vZCB0aGUgc2VxdWVuY2UgYnknLFxyXG4gICAgICAgIHJlcXVpcmVkOiBmYWxzZVxyXG4gICAgfVxyXG59O1xyXG5cclxuXHJcbmNvbnN0IFNFUV9QcmltZXMgPSB7XHJcbiAgICBnZW5lcmF0b3I6IEdFTl9QcmltZXMsXHJcbiAgICBuYW1lOiBcIlByaW1lc1wiLFxyXG4gICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICBwYXJhbXNTY2hlbWE6IFNDSEVNQV9QcmltZXNcclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gU0VRX1ByaW1lczsiLCIvKipcclxuICpcclxuICogQGNsYXNzIFNlcXVlbmNlR2VuZXJhdG9yXHJcbiAqL1xyXG5jbGFzcyBTZXF1ZW5jZUdlbmVyYXRvciB7XHJcbiAgICAvKipcclxuICAgICAqQ3JlYXRlcyBhbiBpbnN0YW5jZSBvZiBTZXF1ZW5jZUdlbmVyYXRvci5cclxuICAgICAqIEBwYXJhbSB7Kn0gZ2VuZXJhdG9yIGEgZnVuY3Rpb24gdGhhdCB0YWtlcyBhIG5hdHVyYWwgbnVtYmVyIGFuZCByZXR1cm5zIGEgbnVtYmVyLCBpdCBjYW4gb3B0aW9uYWxseSB0YWtlIHRoZSBjYWNoZSBhcyBhIHNlY29uZCBhcmd1bWVudFxyXG4gICAgICogQHBhcmFtIHsqfSBJRCB0aGUgSUQgb2YgdGhlIHNlcXVlbmNlXHJcbiAgICAgKiBAbWVtYmVyb2YgU2VxdWVuY2VHZW5lcmF0b3JcclxuICAgICAqL1xyXG4gICAgY29uc3RydWN0b3IoSUQsIGdlbmVyYXRvcikge1xyXG4gICAgICAgIHRoaXMuZ2VuZXJhdG9yID0gZ2VuZXJhdG9yO1xyXG4gICAgICAgIHRoaXMuSUQgPSBJRDtcclxuICAgICAgICB0aGlzLmNhY2hlID0gW107XHJcbiAgICAgICAgdGhpcy5uZXdTaXplID0gMTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogaWYgd2UgbmVlZCB0byBnZXQgdGhlIG50aCBlbGVtZW50IGFuZCBpdCdzIG5vdCBwcmVzZW50IGluXHJcbiAgICAgKiBpbiB0aGUgY2FjaGUsIHRoZW4gd2UgZWl0aGVyIGRvdWJsZSB0aGUgc2l6ZSwgb3IgdGhlIFxyXG4gICAgICogbmV3IHNpemUgYmVjb21lcyBuKzFcclxuICAgICAqIEBwYXJhbSB7Kn0gbiBcclxuICAgICAqIEBtZW1iZXJvZiBTZXF1ZW5jZUdlbmVyYXRvclxyXG4gICAgICovXHJcbiAgICByZXNpemVDYWNoZShuKSB7XHJcbiAgICAgICAgdGhpcy5uZXdTaXplID0gdGhpcy5jYWNoZS5sZW5ndGggKiAyO1xyXG4gICAgICAgIGlmIChuICsgMSA+IHRoaXMubmV3U2l6ZSkge1xyXG4gICAgICAgICAgICB0aGlzLm5ld1NpemUgPSBuICsgMTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIFBvcHVsYXRlcyB0aGUgY2FjaGUgdXAgdW50aWwgdGhlIGN1cnJlbnQgbmV3U2l6ZVxyXG4gICAgICogdGhpcyBpcyBjYWxsZWQgYWZ0ZXIgcmVzaXplQ2FjaGVcclxuICAgICAqIEBtZW1iZXJvZiBTZXF1ZW5jZUdlbmVyYXRvclxyXG4gICAgICovXHJcbiAgICBmaWxsQ2FjaGUoKSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IHRoaXMuY2FjaGUubGVuZ3RoOyBpIDwgdGhpcy5uZXdTaXplOyBpKyspIHtcclxuICAgICAgICAgICAgLy90aGUgZ2VuZXJhdG9yIGlzIGdpdmVuIHRoZSBjYWNoZSBzaW5jZSBpdCB3b3VsZCBtYWtlIGNvbXB1dGF0aW9uIG1vcmUgZWZmaWNpZW50IHNvbWV0aW1lc1xyXG4gICAgICAgICAgICAvL2J1dCB0aGUgZ2VuZXJhdG9yIGRvZXNuJ3QgbmVjZXNzYXJpbHkgbmVlZCB0byB0YWtlIG1vcmUgdGhhbiBvbmUgYXJndW1lbnQuXHJcbiAgICAgICAgICAgIHRoaXMuY2FjaGVbaV0gPSB0aGlzLmdlbmVyYXRvcihpLCB0aGlzLmNhY2hlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIEdldCBlbGVtZW50IGlzIHdoYXQgdGhlIGRyYXdpbmcgdG9vbHMgd2lsbCBiZSBjYWxsaW5nLCBpdCByZXRyaWV2ZXNcclxuICAgICAqIHRoZSBudGggZWxlbWVudCBvZiB0aGUgc2VxdWVuY2UgYnkgZWl0aGVyIGdldHRpbmcgaXQgZnJvbSB0aGUgY2FjaGVcclxuICAgICAqIG9yIGlmIGlzbid0IHByZXNlbnQsIGJ5IGJ1aWxkaW5nIHRoZSBjYWNoZSBhbmQgdGhlbiBnZXR0aW5nIGl0XHJcbiAgICAgKiBAcGFyYW0geyp9IG4gdGhlIGluZGV4IG9mIHRoZSBlbGVtZW50IGluIHRoZSBzZXF1ZW5jZSB3ZSB3YW50XHJcbiAgICAgKiBAcmV0dXJucyBhIG51bWJlclxyXG4gICAgICogQG1lbWJlcm9mIFNlcXVlbmNlR2VuZXJhdG9yXHJcbiAgICAgKi9cclxuICAgIGdldEVsZW1lbnQobikge1xyXG4gICAgICAgIGlmICh0aGlzLmNhY2hlW25dICE9IHVuZGVmaW5lZCB8fCB0aGlzLmZpbml0ZSkge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImNhY2hlIGhpdFwiKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVtuXTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImNhY2hlIG1pc3NcIilcclxuICAgICAgICAgICAgdGhpcy5yZXNpemVDYWNoZShuKTtcclxuICAgICAgICAgICAgdGhpcy5maWxsQ2FjaGUoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVbbl07XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuLyoqXHJcbiAqXHJcbiAqXHJcbiAqIEBwYXJhbSB7Kn0gY29kZSBhcmJpdHJhcnkgc2FnZSBjb2RlIHRvIGJlIGV4ZWN1dGVkIG9uIGFsZXBoXHJcbiAqIEByZXR1cm5zIGFqYXggcmVzcG9uc2Ugb2JqZWN0XHJcbiAqL1xyXG5mdW5jdGlvbiBzYWdlRXhlY3V0ZShjb2RlKSB7XHJcbiAgICByZXR1cm4gJC5hamF4KHtcclxuICAgICAgICB0eXBlOiAnUE9TVCcsXHJcbiAgICAgICAgYXN5bmM6IGZhbHNlLFxyXG4gICAgICAgIHVybDogJ2h0dHA6Ly9hbGVwaC5zYWdlbWF0aC5vcmcvc2VydmljZScsXHJcbiAgICAgICAgZGF0YTogXCJjb2RlPVwiICsgY29kZVxyXG4gICAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKlxyXG4gKlxyXG4gKiBAcGFyYW0geyp9IGNvZGUgYXJiaXRyYXJ5IHNhZ2UgY29kZSB0byBiZSBleGVjdXRlZCBvbiBhbGVwaFxyXG4gKiBAcmV0dXJucyBhamF4IHJlc3BvbnNlIG9iamVjdFxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gc2FnZUV4ZWN1dGVBc3luYyhjb2RlKSB7XHJcbiAgICByZXR1cm4gYXdhaXQgJC5hamF4KHtcclxuICAgICAgICB0eXBlOiAnUE9TVCcsXHJcbiAgICAgICAgdXJsOiAnaHR0cDovL2FsZXBoLnNhZ2VtYXRoLm9yZy9zZXJ2aWNlJyxcclxuICAgICAgICBkYXRhOiBcImNvZGU9XCIgKyBjb2RlXHJcbiAgICB9KTtcclxufVxyXG5cclxuXHJcbmNsYXNzIE9FSVNTZXF1ZW5jZUdlbmVyYXRvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihJRCwgT0VJUykge1xyXG4gICAgICAgIHRoaXMuT0VJUyA9IE9FSVM7XHJcbiAgICAgICAgdGhpcy5JRCA9IElEO1xyXG4gICAgICAgIHRoaXMuY2FjaGUgPSBbXTtcclxuICAgICAgICB0aGlzLm5ld1NpemUgPSAxO1xyXG4gICAgICAgIHRoaXMucHJlZmlsbENhY2hlKCk7XHJcbiAgICB9XHJcbiAgICBvZWlzRmV0Y2gobikge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiRmV0Y2hpbmcuLlwiKTtcclxuICAgICAgICBsZXQgY29kZSA9IGBwcmludChzbG9hbmUuJHt0aGlzLk9FSVN9Lmxpc3QoJHtufSkpYDtcclxuICAgICAgICBsZXQgcmVzcCA9IHNhZ2VFeGVjdXRlKGNvZGUpO1xyXG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKHJlc3AucmVzcG9uc2VKU09OLnN0ZG91dCk7XHJcbiAgICB9XHJcbiAgICBhc3luYyBwcmVmaWxsQ2FjaGUoKSB7XHJcbiAgICAgICAgdGhpcy5yZXNpemVDYWNoZSgzMDAwKTtcclxuICAgICAgICBsZXQgY29kZSA9IGBwcmludChzbG9hbmUuJHt0aGlzLk9FSVN9Lmxpc3QoJHt0aGlzLm5ld1NpemV9KSlgO1xyXG4gICAgICAgIGxldCByZXNwID0gYXdhaXQgc2FnZUV4ZWN1dGVBc3luYyhjb2RlKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhyZXNwKTtcclxuICAgICAgICB0aGlzLmNhY2hlID0gdGhpcy5jYWNoZS5jb25jYXQoSlNPTi5wYXJzZShyZXNwLnN0ZG91dCkpO1xyXG4gICAgfVxyXG4gICAgcmVzaXplQ2FjaGUobikge1xyXG4gICAgICAgIHRoaXMubmV3U2l6ZSA9IHRoaXMuY2FjaGUubGVuZ3RoICogMjtcclxuICAgICAgICBpZiAobiArIDEgPiB0aGlzLm5ld1NpemUpIHtcclxuICAgICAgICAgICAgdGhpcy5uZXdTaXplID0gbiArIDE7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZmlsbENhY2hlKCkge1xyXG4gICAgICAgIGxldCBuZXdMaXN0ID0gdGhpcy5vZWlzRmV0Y2godGhpcy5uZXdTaXplKTtcclxuICAgICAgICB0aGlzLmNhY2hlID0gdGhpcy5jYWNoZS5jb25jYXQobmV3TGlzdCk7XHJcbiAgICB9XHJcbiAgICBnZXRFbGVtZW50KG4pIHtcclxuICAgICAgICBpZiAodGhpcy5jYWNoZVtuXSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY2FjaGVbbl07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5yZXNpemVDYWNoZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmZpbGxDYWNoZSgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWNoZVtuXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIEJ1aWx0SW5OYW1lVG9TZXEoSUQsIHNlcU5hbWUsIHNlcVBhcmFtcykge1xyXG4gICAgbGV0IGdlbmVyYXRvciA9IEJ1aWx0SW5TZXFzW3NlcU5hbWVdLmdlbmVyYXRvcihzZXFQYXJhbXMpO1xyXG4gICAgcmV0dXJuIG5ldyBTZXF1ZW5jZUdlbmVyYXRvcihJRCwgZ2VuZXJhdG9yKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIExpc3RUb1NlcShJRCwgbGlzdCkge1xyXG4gICAgbGV0IGxpc3RHZW5lcmF0b3IgPSBmdW5jdGlvbiAobikge1xyXG4gICAgICAgIHJldHVybiBsaXN0W25dO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBuZXcgU2VxdWVuY2VHZW5lcmF0b3IoSUQsIGxpc3RHZW5lcmF0b3IpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBPRUlTVG9TZXEoSUQsIE9FSVMpIHtcclxuICAgIHJldHVybiBuZXcgT0VJU1NlcXVlbmNlR2VuZXJhdG9yKElELCBPRUlTKTtcclxufVxyXG5cclxuXHJcbmNvbnN0IEJ1aWx0SW5TZXFzID0ge307XHJcblxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgICAnQnVpbHRJbk5hbWVUb1NlcSc6IEJ1aWx0SW5OYW1lVG9TZXEsXHJcbiAgICAnTGlzdFRvU2VxJzogTGlzdFRvU2VxLFxyXG4gICAgJ09FSVNUb1NlcSc6IE9FSVNUb1NlcSxcclxuICAgICdCdWlsdEluU2Vxcyc6IEJ1aWx0SW5TZXFzXHJcbn07XHJcblxyXG4vKmpzaGludCBpZ25vcmU6IHN0YXJ0ICovXHJcbkJ1aWx0SW5TZXFzW1wiRmlib25hY2NpXCJdID0gcmVxdWlyZSgnLi9zZXF1ZW5jZUZpYm9uYWNjaS5qcycpO1xyXG5CdWlsdEluU2Vxc1tcIkx1Y2FzXCJdID0gcmVxdWlyZSgnLi9zZXF1ZW5jZUx1Y2FzLmpzJyk7XHJcbkJ1aWx0SW5TZXFzW1wiUHJpbWVzXCJdID0gcmVxdWlyZSgnLi9zZXF1ZW5jZVByaW1lcy5qcycpO1xyXG5CdWlsdEluU2Vxc1tcIk5hdHVyYWxzXCJdID0gcmVxdWlyZSgnLi9zZXF1ZW5jZU5hdHVyYWxzLmpzJyk7XHJcbkJ1aWx0SW5TZXFzW1wiTGluUmVjXCJdID0gcmVxdWlyZSgnLi9zZXF1ZW5jZUxpblJlYy5qcycpO1xyXG5CdWlsdEluU2Vxc1snUHJpbWVzJ10gPSByZXF1aXJlKCcuL3NlcXVlbmNlUHJpbWVzLmpzJyk7IiwibW9kdWxlLmV4cG9ydHMgPSBbXCJBMDAwMDAxXCIsIFwiQTAwMDAyN1wiLCBcIkEwMDAwMDRcIiwgXCJBMDAwMDA1XCIsIFwiQTAwMDAwOFwiLCBcIkEwMDAwMDlcIiwgXCJBMDAwNzk2XCIsIFwiQTAwMzQxOFwiLCBcIkEwMDczMThcIiwgXCJBMDA4Mjc1XCIsIFwiQTAwODI3N1wiLCBcIkEwNDkzMTBcIiwgXCJBMDAwMDEwXCIsIFwiQTAwMDAwN1wiLCBcIkEwMDU4NDNcIiwgXCJBMDAwMDM1XCIsIFwiQTAwMDE2OVwiLCBcIkEwMDAyNzJcIiwgXCJBMDAwMzEyXCIsIFwiQTAwMTQ3N1wiLCBcIkEwMDQ1MjZcIiwgXCJBMDAwMzI2XCIsIFwiQTAwMjM3OFwiLCBcIkEwMDI2MjBcIiwgXCJBMDA1NDA4XCIsIFwiQTAwMDAxMlwiLCBcIkEwMDAxMjBcIiwgXCJBMDEwMDYwXCIsIFwiQTAwMDA2OVwiLCBcIkEwMDE5NjlcIiwgXCJBMDAwMjkwXCIsIFwiQTAwMDIyNVwiLCBcIkEwMDAwMTVcIiwgXCJBMDAwMDE2XCIsIFwiQTAwMDAzMlwiLCBcIkEwMDQwODZcIiwgXCJBMDAyMTEzXCIsIFwiQTAwMDAzMFwiLCBcIkEwMDAwNDBcIiwgXCJBMDAyODA4XCIsIFwiQTAxODI1MlwiLCBcIkEwMDAwNDNcIiwgXCJBMDAwNjY4XCIsIFwiQTAwMDM5NlwiLCBcIkEwMDUxMDBcIiwgXCJBMDA1MTAxXCIsIFwiQTAwMjExMFwiLCBcIkEwMDA3MjBcIiwgXCJBMDY0NTUzXCIsIFwiQTAwMTA1NVwiLCBcIkEwMDY1MzBcIiwgXCJBMDAwOTYxXCIsIFwiQTAwNTExN1wiLCBcIkEwMjA2MzlcIiwgXCJBMDAwMDQxXCIsIFwiQTAwMDA0NVwiLCBcIkEwMDAxMDhcIiwgXCJBMDAxMDA2XCIsIFwiQTAwMDA3OVwiLCBcIkEwMDA1NzhcIiwgXCJBMDAwMjQ0XCIsIFwiQTAwMDMwMlwiLCBcIkEwMDA1ODNcIiwgXCJBMDAwMTQyXCIsIFwiQTAwMDA4NVwiLCBcIkEwMDExODlcIiwgXCJBMDAwNjcwXCIsIFwiQTAwNjMxOFwiLCBcIkEwMDAxNjVcIiwgXCJBMDAxMTQ3XCIsIFwiQTAwNjg4MlwiLCBcIkEwMDA5ODRcIiwgXCJBMDAxNDA1XCIsIFwiQTAwMDI5MlwiLCBcIkEwMDAzMzBcIiwgXCJBMDAwMTUzXCIsIFwiQTAwMDI1NVwiLCBcIkEwMDAyNjFcIiwgXCJBMDAxOTA5XCIsIFwiQTAwMTkxMFwiLCBcIkEwOTAwMTBcIiwgXCJBMDU1NzkwXCIsIFwiQTA5MDAxMlwiLCBcIkEwOTAwMTNcIiwgXCJBMDkwMDE0XCIsIFwiQTA5MDAxNVwiLCBcIkEwOTAwMTZcIiwgXCJBMDAwMTY2XCIsIFwiQTAwMDIwM1wiLCBcIkEwMDExNTdcIiwgXCJBMDA4NjgzXCIsIFwiQTAwMDIwNFwiLCBcIkEwMDAyMTdcIiwgXCJBMDAwMTI0XCIsIFwiQTAwMjI3NVwiLCBcIkEwMDExMTBcIiwgXCJBMDUxOTU5XCIsIFwiQTAwMTIyMVwiLCBcIkEwMDEyMjJcIiwgXCJBMDQ2NjYwXCIsIFwiQTAwMTIyN1wiLCBcIkEwMDEzNThcIiwgXCJBMDAxNjk0XCIsIFwiQTAwMTgzNlwiLCBcIkEwMDE5MDZcIiwgXCJBMDAxMzMzXCIsIFwiQTAwMTA0NVwiLCBcIkEwMDAxMjlcIiwgXCJBMDAxMTA5XCIsIFwiQTAxNTUyMVwiLCBcIkEwMTU1MjNcIiwgXCJBMDE1NTMwXCIsIFwiQTAxNTUzMVwiLCBcIkEwMTU1NTFcIiwgXCJBMDgyNDExXCIsIFwiQTA4MzEwM1wiLCBcIkEwODMxMDRcIiwgXCJBMDgzMTA1XCIsIFwiQTA4MzIxNlwiLCBcIkEwNjEwODRcIiwgXCJBMDAwMjEzXCIsIFwiQTAwMDA3M1wiLCBcIkEwNzk5MjJcIiwgXCJBMDc5OTIzXCIsIFwiQTEwOTgxNFwiLCBcIkExMTE3NzRcIiwgXCJBMTExNzc1XCIsIFwiQTExMTc4N1wiLCBcIkEwMDAxMTBcIiwgXCJBMDAwNTg3XCIsIFwiQTAwMDEwMFwiXVxyXG4iXX0=
