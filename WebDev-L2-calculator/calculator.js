
// ==========================================
// CALCVERSE SCIENTIFIC CALCULATOR
// ==========================================


// ==========================================
// 1. SELECT HTML ELEMENTS
// ==========================================

const expressionDisplay =
    document.getElementById("expression");

const resultDisplay =
    document.getElementById("result");

const calculator =
    document.getElementById("calculator");

const valueButtons =
    document.querySelectorAll("[data-value]");

const actionButtons =
    document.querySelectorAll("[data-action]");

const modeButtons =
    document.querySelectorAll("[data-mode]");


// ==========================================
// 2. CALCULATOR VARIABLES
// ==========================================

let expression = "";

let angleMode = "DEG";

let lastAnswer = 0;

let justEvaluated = false;

let hasError = false;


// ==========================================
// 3. DISPLAY FUNCTIONS
// ==========================================

function updateDisplay() {

    expressionDisplay.textContent = expression;

}


function clearCalculator() {

    expression = "";

    justEvaluated = false;

    hasError = false;

    expressionDisplay.textContent = "";

    resultDisplay.textContent = "0";

}


function deleteLast() {

    if (justEvaluated) {

        expression = String(lastAnswer)
            .replace(/e/g, "E");

    }

    expression = expression.slice(0, -1);

    justEvaluated = false;

    hasError = false;

    resultDisplay.textContent = "0";

    updateDisplay();

}


// ==========================================
// 4. FORMAT FINAL ANSWER
// ==========================================

function formatResult(value) {

    if (!Number.isFinite(value)) {

        throw new Error("Math Error");

    }

    return Number(value.toPrecision(12)).toString();

}


// ==========================================
// 5. DEGREE AND RADIAN CONVERSION
// ==========================================

function toRadians(value) {

    if (angleMode === "DEG") {

        return value * Math.PI / 180;

    }

    return value;

}


function fromRadians(value) {

    if (angleMode === "DEG") {

        return value * 180 / Math.PI;

    }

    return value;

}


// ==========================================
// 6. FACTORIAL FUNCTION
// ==========================================

function factorial(number) {

    if (
        number < 0 ||
        !Number.isInteger(number) ||
        number > 170
    ) {

        throw new Error("Invalid factorial");

    }

    let answer = 1;

    for (let i = 2; i <= number; i++) {

        answer *= i;

    }

    return answer;

}


// ==========================================
// 7. SCIENTIFIC FUNCTIONS
// ==========================================

function scientificFunction(name, value) {

    switch (name) {


        // Sine

        case "sin": {

            const answer = Math.sin(
                toRadians(value)
            );

            return Math.abs(answer) < 1e-15
                ? 0 : answer;

        }


        // Cosine

        case "cos": {

            const answer = Math.cos(
                toRadians(value)
            );

            return Math.abs(answer) < 1e-15
                ? 0 : answer;

        }


        // Tangent

        case "tan": {

            const angle = toRadians(value);

            if (
                Math.abs(Math.cos(angle)) < 1e-12
            ) {

                throw new Error(
                    "Undefined tangent"
                );

            }

            const answer = Math.tan(angle);

            return Math.abs(answer) < 1e-15
                ? 0 : answer;

        }


        // Inverse Sine

        case "asin":

            if (value < -1 || value > 1) {

                throw new Error(
                    "Invalid inverse sine"
                );

            }

            return fromRadians(
                Math.asin(value)
            );


        // Inverse Cosine

        case "acos":

            if (value < -1 || value > 1) {

                throw new Error(
                    "Invalid inverse cosine"
                );

            }

            return fromRadians(
                Math.acos(value)
            );


        // Inverse Tangent

        case "atan":

            return fromRadians(
                Math.atan(value)
            );


        // Base 10 Logarithm

        case "log":

            if (value <= 0) {

                throw new Error(
                    "Invalid logarithm"
                );

            }

            return Math.log10(value);


        // Natural Logarithm

        case "ln":

            if (value <= 0) {

                throw new Error(
                    "Invalid logarithm"
                );

            }

            return Math.log(value);


        // Square Root

        case "sqrt":

            if (value < 0) {

                throw new Error(
                    "Invalid square root"
                );

            }

            return Math.sqrt(value);


        // Cube Root

        case "cbrt":

            return Math.cbrt(value);


        // Absolute Value

        case "abs":

            return Math.abs(value);


        default:

            throw new Error(
                "Unknown function"
            );

    }

}


// ==========================================
// 8. TOKENIZER
// ==========================================

// Converts expressions into numbers,
// operators, constants and functions.

function tokenize(input) {

    const normalized = input

        .replace(/×/g, "*")

        .replace(/÷/g, "/")

        .replace(/−/g, "-")

        .replace(/\s/g, "");


    const pattern =
        /(?:\d+(?:\.\d*)?|\.\d+)(?:E[+-]?\d+)?|asin|acos|atan|sqrt|cbrt|sin|cos|tan|log|ln|abs|π|e|[+\-*/^!%()]/g;


    const rawTokens = normalized.match(pattern);


    if (
        !rawTokens ||
        rawTokens.join("") !== normalized
    ) {

        throw new Error("Syntax Error");

    }


    const tokens = [];


    function isNumber(token) {

        return /^(?:\d|\.\d)/.test(token);

    }


    function endsValue(token) {

        return (

            isNumber(token) ||

            ["π", "e", ")", "!", "%"]
                .includes(token)

        );

    }


    function startsValue(token) {

        return (

            isNumber(token) ||

            [

                "π", "e", "(",

                "sin", "cos", "tan",

                "asin", "acos", "atan",

                "log", "ln", "sqrt",

                "cbrt", "abs"

            ].includes(token)

        );

    }


    // Implicit multiplication
    // Examples: 2π, 2(3+4), 3sin(30)

    rawTokens.forEach(function (token, index) {

        const previous = rawTokens[index - 1];

        if (index > 0) {

            if (
                isNumber(previous) &&
                isNumber(token)
            ) {

                throw new Error(
                    "Invalid number"
                );

            }

            if (
                endsValue(previous) &&
                startsValue(token)
            ) {

                tokens.push("*");

            }

        }

        tokens.push(token);

    });

    return tokens;

}


// ==========================================
// 9. EXPRESSION EVALUATION ENGINE
// ==========================================

// Recursive descent parser.
// Supports operator precedence.
// No eval() is used.

function evaluateExpression(input) {

    const tokens = tokenize(input);

    let position = 0;


    // Check the current token

    function peek() {

        return tokens[position];

    }


    // Read and move to the next token

    function consume() {

        return tokens[position++];

    }


    // Validate expected tokens

    function expect(expected) {

        if (consume() !== expected) {

            throw new Error("Syntax Error");

        }

    }


    // --------------------------------------
    // Addition and Subtraction
    // --------------------------------------

    function parseExpression() {

        let value = parseTerm();

        while (
            peek() === "+" ||
            peek() === "-"
        ) {

            const operator = consume();

            const right = parseTerm();

            switch (operator) {

                case "+":

                    value += right;

                    break;

                case "-":

                    value -= right;

                    break;

            }

        }

        return value;

    }


    // --------------------------------------
    // Multiplication and Division
    // --------------------------------------

    function parseTerm() {

        let value = parseUnary();

        while (
            peek() === "*" ||
            peek() === "/"
        ) {

            const operator = consume();

            const right = parseUnary();

            switch (operator) {

                case "*":

                    value *= right;

                    break;


                case "/":

                    if (right === 0) {

                        throw new Error(
                            "Cannot divide by zero"
                        );

                    }

                    value /= right;

                    break;

            }

        }

        return value;

    }


    // --------------------------------------
    // Positive and Negative Numbers
    // --------------------------------------

    function parseUnary() {

        if (peek() === "+") {

            consume();

            return parseUnary();

        }

        if (peek() === "-") {

            consume();

            return -parseUnary();

        }

        return parsePower();

    }


    // --------------------------------------
    // Exponents and Powers
    // --------------------------------------

    function parsePower() {

        let value = parsePostfix();

        if (peek() === "^") {

            consume();

            value = Math.pow(

                value,

                parseUnary()

            );

        }

        return value;

    }


    // --------------------------------------
    // Factorial and Percentage
    // --------------------------------------

    function parsePostfix() {

        let value = parsePrimary();

        while (
            peek() === "!" ||
            peek() === "%"
        ) {

            const operator = consume();

            if (operator === "!") {

                value = factorial(value);

            } else {

                value = value / 100;

            }

        }

        return value;

    }


    // --------------------------------------
    // Numbers and Scientific Functions
    // --------------------------------------

    function parsePrimary() {

        const token = consume();

        if (token === undefined) {

            throw new Error(
                "Incomplete expression"
            );

        }


        // Parentheses

        if (token === "(") {

            const value = parseExpression();

            expect(")");

            return value;

        }


        // Pi Constant

        if (token === "π") {

            return Math.PI;

        }


        // Euler's Number

        if (token === "e") {

            return Math.E;

        }


        // Scientific Functions

        const functions = [

            "sin", "cos", "tan",

            "asin", "acos", "atan",

            "log", "ln",

            "sqrt", "cbrt", "abs"

        ];


        if (functions.includes(token)) {

            expect("(");

            const value = parseExpression();

            expect(")");

            return scientificFunction(

                token,

                value

            );

        }


        // Numeric Values

        if (/^(?:\d|\.\d)/.test(token)) {

            const value = parseFloat(token);

            if (!Number.isFinite(value)) {

                throw new Error("Math Error");

            }

            return value;

        }

        throw new Error("Syntax Error");

    }


    // Evaluate complete expression

    const answer = parseExpression();


    if (position !== tokens.length) {

        throw new Error("Syntax Error");

    }


    if (!Number.isFinite(answer)) {

        throw new Error("Math Error");

    }

    return answer;

}


// ==========================================
// 10. CALCULATE FINAL ANSWER
// ==========================================

function calculateResult() {

    if (
        expression.trim() === "" ||
        justEvaluated
    ) {

        return;

    }

    try {

        const answer =
            evaluateExpression(expression);

        const formatted =
            formatResult(answer);

        lastAnswer = answer;

        expressionDisplay.textContent =
            expression + " =";

        resultDisplay.textContent =
            formatted;

        justEvaluated = true;

        hasError = false;

    } catch (error) {

        expressionDisplay.textContent =
            error.message;

        resultDisplay.textContent =
            "Error";

        justEvaluated = false;

        hasError = true;

    }

}


// ==========================================
// 11. HANDLE CALCULATOR INPUT
// ==========================================

function appendValue(value) {

    const operators = [

        "+", "−", "-", "×", "*",

        "÷", "/", "^", "^2", "^3",

        "%", "!"

    ];


    // Continue calculating after a result

    if (justEvaluated) {

        if (operators.includes(value)) {

            const previousAnswer =
                String(lastAnswer)
                    .replace(/e/g, "E");

            expression =
                lastAnswer < 0
                    ? "(" + previousAnswer + ")"
                    : previousAnswer;

        } else {

            expression = "";

        }

        resultDisplay.textContent = "0";

        justEvaluated = false;

    }


    // Reset erroneous expressions

    if (hasError) {

        expression = "";

        resultDisplay.textContent = "0";

        hasError = false;

    }


    // Limit expression length

    if (expression.length + value.length > 200) {

        return;

    }


    // Prevent repeated decimal points

    if (value === ".") {

        const currentNumber =
            expression.match(/[\d.]+$/);

        if (
            currentNumber &&
            currentNumber[0].includes(".")
        ) {

            return;

        }

    }


    expression += value;

    updateDisplay();

}


// ==========================================
// 12. POSITIVE AND NEGATIVE BUTTON
// ==========================================

function toggleSign() {

    if (hasError) {

        clearCalculator();

    }

    if (justEvaluated) {

        expression =
            String(-lastAnswer)
                .replace(/e/g, "E");

        justEvaluated = false;

    } else if (expression === "") {

        expression = "−";

    } else if (expression === "−") {

        expression = "";

    } else if (
        expression.startsWith("−(") &&
        expression.endsWith(")") &&
        isWholeNegation(expression)
    ) {

        expression = expression.slice(2, -1);

    } else {

        expression = "−(" + expression + ")";

    }

    resultDisplay.textContent = "0";

    updateDisplay();

}


// Check whether the negative sign
// applies to the whole expression.

function isWholeNegation(input) {

    let depth = 0;

    for (let i = 1; i < input.length; i++) {

        if (input[i] === "(") {

            depth++;

        }

        if (input[i] === ")") {

            depth--;

            if (depth === 0) {

                return i === input.length - 1;

            }

        }

    }

    return false;

}


// ==========================================
// 13. NUMERIC AND SCIENTIFIC BUTTON EVENTS
// ==========================================

valueButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            appendValue(button.dataset.value);

        }
    );

});


// ==========================================
// 14. CONTROL BUTTON EVENTS
// ==========================================

actionButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            const action =
                button.dataset.action;

            switch (action) {


                // AC Button

                case "clear":

                    clearCalculator();

                    break;


                // DEL Button

                case "delete":

                    deleteLast();

                    break;


                // Positive and Negative Button

                case "sign":

                    toggleSign();

                    break;


                // Equals Button

                case "equals":

                    calculateResult();

                    break;

            }

        }
    );

});


// ==========================================
// 15. DEG AND RAD MODE BUTTONS
// ==========================================

modeButtons.forEach(function (button) {

    button.addEventListener(
        "click",
        function () {

            angleMode = button.dataset.mode;

            modeButtons.forEach(function (b) {

                b.classList.remove("active");

                b.setAttribute(
                    "aria-pressed",
                    "false"
                );

            });

            button.classList.add("active");

            button.setAttribute(
                "aria-pressed",
                "true"
            );

            justEvaluated = false;

            hasError = false;

            resultDisplay.textContent = "0";

            updateDisplay();

        }
    );

});


// ==========================================
// 16. KEYBOARD SUPPORT
// ==========================================

document.addEventListener(
    "keydown",
    function (event) {

        const key = event.key;

        if (
            event.ctrlKey ||
            event.altKey ||
            event.metaKey
        ) {

            return;

        }

        if (
            event.target.matches(
                "input, textarea, select"
            )
        ) {

            return;

        }

        if (/^[0-9.]$/.test(key)) {

            appendValue(key);

        } else if (key === "+") {

            appendValue("+");

        } else if (key === "-") {

            appendValue("−");

        } else if (key === "*") {

            appendValue("×");

        } else if (key === "/") {

            appendValue("÷");

        } else if (

            ["(", ")", "^", "!", "%"]
                .includes(key)

        ) {

            appendValue(key);

        } else if (

            key === "Enter" ||
            key === "="

        ) {

            if (
                key === "Enter" &&
                event.target.matches("button, a")
            ) {
                return;
            }

            calculateResult();

        } else if (key === "Backspace") {

            deleteLast();

        } else if (

            key === "Escape" ||
            key === "Delete"

        ) {

            clearCalculator();

        } else {

            return;

        }

        event.preventDefault();

    }
);


// ==========================================
// 17. INTERACTIVE 3D EFFECT
// ==========================================

const reducedMotion = window.matchMedia(

    "(prefers-reduced-motion: reduce)"

);


calculator.addEventListener(
    "mousemove",
    function (event) {

        if (reducedMotion.matches) {

            return;

        }

        const rect =
            calculator.getBoundingClientRect();

        const x = event.clientX - rect.left;

        const y = event.clientY - rect.top;

        const rotateX =
            (rect.height / 2 - y) / 100;

        const rotateY =
            (x - rect.width / 2) / 100;

        calculator.style.transform =

            `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    }
);


// Reset calculator position

calculator.addEventListener(
    "mouseleave",
    function () {

        calculator.style.transform =

            "rotateX(0deg) rotateY(0deg)";

    }
);


// ==========================================
// 18. INITIALIZE CALCULATOR
// ==========================================

clearCalculator();
