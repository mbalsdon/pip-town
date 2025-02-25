//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//

let overlayElmt;
export function register_controls_helper() {
    overlayElmt = document.createElement("div");
    overlayElmt.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: auto;
        height: auto;
        pointer-events: none;
        overflow: hidden;
        display: flex;
        z-index: 1000;
        max-height: 80vh;
    `;

    const imgElmt = document.createElement("img");
    imgElmt.src = "/src/assets/images/controls.jpg";
    imgElmt.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        z-index: 1;
        max-height: 80vh;
    `;

    const closeBtnElmt = document.createElement("button");
    closeBtnElmt.textContent = "X";
    closeBtnElmt.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        z-index: 10;
        background-color: white;
        border: 2px solid black;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        font-size: 18px;
        font-weight: bold;
        line-height: 1;
    `;
    closeBtnElmt.style.pointerEvents = "auto";
    closeBtnElmt.addEventListener("click", (e) => {
        overlayElmt.style.display = "none";
        e.stopPropagation();
    });

    overlayElmt.appendChild(imgElmt);
    overlayElmt.appendChild(closeBtnElmt);
    document.body.appendChild(overlayElmt);

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (overlayElmt.style.display === "flex") overlayElmt.style.display = "none";
            else overlayElmt.style.display = "flex";
        }
    });
}

//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//\\//
