import { DIALOGUE_DEFAULT_CHAR_SPEED, DIALOGUE_DEFAULT_CHAR_TICK, DIALOGUE_DEFAULT_FONT_SIZE, DIALOGUE_DEFAULT_NUM_CHARS } from "../consts";

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

export class Dialogue {
    constructor() {
        this._interactionElmt = document.createElement("div");
        this._imageElmt = document.createElement("div");
        this._nameElmt = document.createElement("div");
        this._textElmt = document.createElement("div");
        this._textOverlayElmt = document.createElement("div");
        this._imgOverlayElmt = document.createElement("img");

        this._interactionElmt.style.cssText = `
            position: absolute;
            bottom: 5%;
            left: 20%;
            right: 20%;
            width: auto;
            height: 25%;
            padding: 0.5%;
            color: white;
            font-family: monospace;
            border-radius: 20px;
            z-index: 99;
            display: none;
        `;

        this._imageElmt.style.cssText = `
            height: 100%;
            aspect-ratio: 1;
            background-size: cover;
            background-position: center;
            border-radius: 15px;
            border: solid 2px white;
        `;

        // Create a container for name and text to stack them vertically
        const rightContainer = document.createElement("div");
        rightContainer.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
        `;

        this._nameElmt.style.cssText = `
            height: 20%;
            border-radius: 10px;
            display: flex;
            align-items: center;
            font-size: 4.5vh;
            line-height: 1;
            padding: 0 10px;
            margin-left: 0.5%;
            font-family: "Brush Script MT", cursive;
            font-weight: bold;
            color: #ff902e;
            text-shadow:
                -2px -2px 0 #421f00,
                2px -2px 0 #421f00,
                -2px 2px 0 #421f00,
                2px 2px 0 #421f00;
        `;

        this._textElmt.style.cssText = `
            flex: 1;
            border-radius: 10px;
            display: flex;
            font-size: 2.5vh;
            line-height: 1;
            padding: 10px;
            margin-top: 0.5%;
            margin-left: 0.5%;
            font-family: "Brush Script MT", cursive;
            white-space: pre-wrap;
            overflow-y: auto;
            word-wrap: break-word;
            color: #ffba7d;
        `;

        this._imgOverlayElmt.style.cssText = `
            width: auto;
            height: 100%;
            object-fit: contain;
            align-self: flex-start;
        `;
        this._imgOverlayElmt.hidden = true;

        document.body.appendChild(this._interactionElmt);
        this._interactionElmt.appendChild(this._imageElmt);
        this._textElmt.appendChild(this._textOverlayElmt);
        this._textElmt.appendChild(this._imgOverlayElmt);
        rightContainer.appendChild(this._nameElmt);
        rightContainer.appendChild(this._textElmt);
        this._interactionElmt.appendChild(rightContainer);

        this.isActive = false;
        this.isTyping = false;
        this.messageQueue = [];
    }

    begin(messages, imagePath, displayName) {
        if (this.isActive) throw new Error("Dialogue::begin - dialogue already in progress");

        this.isActive = true;
        this.messageQueue.push(...messages);
        this._imageElmt.style.backgroundImage = `url(${imagePath})`;
        this._nameElmt.textContent = displayName;
        this.continue();
    }

    continue() {
        if (this.isTyping) return;

        if (this.messageQueue.length <= 0) {
            this.isActive = false;
            this._interactionElmt.style.display = "none";
            return;
        }

        if (this.isActive) {
            const message = this.messageQueue.shift();

            this._interactionElmt.style.display = "flex";
            this._textOverlayElmt.textContent = "";
            this._imgOverlayElmt.hidden = true;

            // Config parsing (image)
            if (message.startsWith("ඞimg=")) {
                this._imgOverlayElmt.src = message.split("ඞimg=")[1];
                this._imgOverlayElmt.hidden = false;
                return;
            }

            // Config parsing (text features)
            const config = {
                text: message,
                charTick: DIALOGUE_DEFAULT_CHAR_TICK,
                numChars: DIALOGUE_DEFAULT_NUM_CHARS,
                charSpeed: DIALOGUE_DEFAULT_CHAR_SPEED,
                fontSize: DIALOGUE_DEFAULT_FONT_SIZE
            };
            if (message.startsWith("ඞ")) {
                const parts = message.split("ඞ").filter(part => part);
                config.text = parts[parts.length - 1];
                for (const part of parts.slice(0, -1)) {
                    if (part.startsWith("charTick=")) config.charTick = (part.split("=")[1] !== "false") ;
                    else if (part.startsWith("numChars=")) config.numChars = parseInt(part.split("=")[1]);
                    else if (part.startsWith("charSpeed=")) config.charSpeed = parseInt(part.split("=")[1]);
                    else if (part.startsWith("fontSize=")) config.fontSize = part.split("=")[1];
                }
            }

            // Display message
            this._textElmt.style.fontSize = config.fontSize;
            if (config.charTick) {
                let currentChar = 0;
                const typeNextChar = () => {
                    this.isTyping = true;
                    if (currentChar < config.text.length) {
                        const charsToAdd = config.text.slice(currentChar, currentChar + config.numChars);
                        this._textOverlayElmt.textContent += charsToAdd;
                        currentChar += config.numChars;
                        setTimeout(typeNextChar, config.charSpeed);
                    } else {
                        this.isTyping = false;
                    }
                };
                typeNextChar();
            } else {
                this._textOverlayElmt.textContent = config.text;
            }
        }
    }
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
