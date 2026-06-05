const sb = window.supabase.createClient(
  "https://tcmbiwxyreodcyhdaicd.supabase.co/",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjbWJpd3h5cmVvZGN5aGRhaWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTA4OTksImV4cCI6MjA5NjE2Njg5OX0.88GVXI7Lf4AmXGamKJ67Cy0eY5l0GrKRaiIqchAoMMg"
);


const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const popup = document.getElementById("loginPopup");
const overlay = document.getElementById("overlay");
const colorPicker = document.getElementById("color");

const CELL_SIZE = 30;

let currentUser = null;
const pixels = {};

async function checkUser() {
    const {
        data: { user }
    } = await sb.auth.getUser();

    currentUser = user;
}

checkUser();

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    redrawPixels();
}

window.addEventListener("resize", resizeCanvas);

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x < canvas.width; x += CELL_SIZE) {
        for (let y = 0; y < canvas.height; y += CELL_SIZE) {
            ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
        }
    }
}

function redrawPixels() {
    drawGrid();

    Object.values(pixels).forEach(pixel => {
        ctx.fillStyle = pixel.color;

        ctx.fillRect(
            pixel.x * CELL_SIZE,
            pixel.y * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
        );

        ctx.strokeRect(
            pixel.x * CELL_SIZE,
            pixel.y * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE
        );
    });
}

resizeCanvas();

document.getElementById("signup").onclick = async () => {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const { error } = await sb.auth.signUp({
        email,
        password
    });

    if (error) {
        alert(error.message);
        return;
    }

    alert("Account created!");
};

document.getElementById("login").onclick = async () => {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const { data, error } =
        await sb.auth.signInWithPassword({
            email,
            password
        });

    if (error) {
        alert(error.message);
        return;
    }

    currentUser = data.user;

    popup.style.display = "none";
    overlay.style.display = "none";

    alert("Logged in!");
};

canvas.addEventListener("click", async (e) => {

    if (!currentUser) {
        popup.style.display = "block";
        overlay.style.display = "block";
        return;
    }

    const x = Math.floor(e.offsetX / CELL_SIZE);
    const y = Math.floor(e.offsetY / CELL_SIZE);

    const color = colorPicker.value;

    pixels[`${x},${y}`] = {
        x,
        y,
        color
    };

    redrawPixels();

    const { error } = await sb
        .from("pixels")
        .upsert({
            x,
            y,
            color,
            user_id: currentUser.id
        });

    if (error) {
        console.error(error);
        alert(error.message);
    }
});

async function loadPixels() {

    const { data, error } =
        await sb
            .from("pixels")
            .select("*");

    if (error) {
        console.error(error);
        return;
    }

    data.forEach(pixel => {
        pixels[`${pixel.x},${pixel.y}`] = pixel;
    });

    redrawPixels();
}

loadPixels();

sb.channel("live-pixels")
.on(
    "postgres_changes",
    {
        event: "*",
        schema: "public",
        table: "pixels"
    },
    (payload) => {

        console.log("Realtime update:", payload);

        const p = payload.new;

        if (!p) return;

        pixels[`${p.x},${p.y}`] = p;

        redrawPixels();
    }
)
.subscribe((status) => {
    console.log("Realtime status:", status);
});
