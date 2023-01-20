class RNG {
    constructor(seed) {
        this.state = seed;
    }

    random() {
        this.state = Math.abs(Math.sin(this.state * 128 + 0.1) * 100) % 1;
        return this.state;
    }

    uniform(low, high) {
        return low + this.random() * (high - low);
    }

    integer(low, high) {
        return Math.floor(low + this.random() * (high - low));
    }

    shuffle(array) {
        let i;
        for (i = array.length - 1; i >= 1; i--) {
            let j = this.integer(0, i + 1);
            let temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    choose(array) {
        return array[this.integer(0, array.length)];
    }

    chooseWeighted(array, weights) {
        const weightsSum = weights.reduce((x, y) => x + y, 0);
        const normalizedWeights = weights.map((x) => x / weightsSum);
        let threshold = this.random();
        let cumulative = 0;
        let index = 0;
        for (let weight of normalizedWeights) {
            cumulative += weight;
            if (cumulative >= threshold) {
                return array[index];
            }
            index += 1;
        }
        return array[array.length - 1];
    }
}

function doLineSegmentsIntersect(segment1, segment2) {
    const point1 = segment1[0];
    const point2 = segment1[1];
    const point3 = segment2[0];
    const point4 = segment2[1];

    const a1 = point2.x - point1.x;
    const b1 = point3.x - point4.x;
    const c1 = point3.x - point1.x;

    const a2 = point2.y - point1.y;
    const b2 = point3.y - point4.y;
    const c2 = point3.y - point1.y;

    const d = a1 * b2 - b1 * a2
    const t1 = (c1 * b2 - b1 * c2) / d;
    const t2 = (a1 * c2 - c1 * a2) / d;
    return 0 < t1 && t1 < 1 && 0 < t2 && t2 < 1;
}

function distance(point1, point2) {
    return Math.hypot(point2.x - point1.x, point2.y - point1.y);
}

function generatePoissonDiskSamples(rng, count, width, height, radius, margin) {
    const points = [];
    let i;
    for (i = 0; i < count; i++) {
        let j;
        let candidate;
        for (j = 0; j < 100; j++) {
            candidate = {
                x: margin + rng.random() * (width - 2 * margin), 
                y: margin + rng.random() * (height - 2 * margin) 
            };
            if (points.every((point) => distance(candidate, point) >= radius)) {
                points.push(candidate);
                break;
            }
        }
    }
    return points;
}

function manhattanize(segment, vertical) {
    const point1 = segment[0];
    const point2 = segment[1];
    const pointMiddle = {
        x: vertical ? point1.x : point2.x,
        y: vertical ? point2.y : point1.y,
    };
    return [
        [point1, pointMiddle],
        [pointMiddle, point2]
    ]
}

function zigzagify(segment, rng) {
    const point1 = segment[0];
    const point2 = segment[1];
    const dx = Math.abs(point2.x - point1.x);
    const dy = Math.abs(point2.y - point1.y);
    let pointMiddle1;
    let pointMiddle2;
    if (dx >= dy) {
        let middleY = rng.uniform(point1.y, point2.y);
        pointMiddle1 = { x: point1.x, y: middleY };
        pointMiddle2 = { x: point2.x, y: middleY };
    } else {
        let middleX = rng.uniform(point1.x, point2.x);
        pointMiddle1 = { x: middleX, y: point1.y };
        pointMiddle2 = { x: middleX, y: point2.y };
    }
    return [
        [point1, pointMiddle1],
        [pointMiddle1, pointMiddle2],
        [pointMiddle2, point2]
    ]
}

function diagonalify(segment) {
    const point1 = segment[0];
    const point2 = segment[1];
    const dx = Math.abs(point2.x - point1.x);
    const dy = Math.abs(point2.y - point1.y);
    let pointMiddle;
    if (dx >= dy) {
        pointMiddle = { x: point1.x + dy * Math.sign(point2.x - point1.x), y: point2.y };
    } else {
        pointMiddle = { x: point2.x, y: point1.y + dx * Math.sign(point2.y - point1.y)};
    }
    return [
        [point1, pointMiddle],
        [pointMiddle, point2]
    ]
}

const PATH_TYPES = ["line", "manhattan1", "manhattan2", "zigzag", "diagonal"];

function pickPath(segment, existingSegments, rng, weights) {
    const pathTypes = {
        line: [segment],
        manhattan1: manhattanize(segment, false),
        manhattan2: manhattanize(segment, true),
        zigzag: zigzagify(segment, rng),
        diagonal: diagonalify(segment),
    };
    const candidatePaths = [];
    for (let pathType of Object.keys(weights)) {
        if (rng.random() < weights[pathType]) {
            candidatePaths.push(pathTypes[pathType]);
        }
    }
    rng.shuffle(candidatePaths);

    function pathIntersects(path) {
        for (let segmentA of path) {
            for (let segmentB of existingSegments) {
                if (doLineSegmentsIntersect(segmentA, segmentB)) {
                    return true;
                }
            }
        }
        return false;
    };

    for (let path of candidatePaths) {
        if (!pathIntersects(path)) {
            return path;
        }
    }
    return null;
}

function makeSquiggles(point1, point2) {
    const length = distance(point1, point2);
    const approxSquiggleSize = 5;
    const squiggleDepth = 3;
    const numSquiggles = Math.ceil(length / approxSquiggleSize);
    const dx = (point2.x - point1.x) / numSquiggles;
    const dy = (point2.y - point1.y) / numSquiggles;
    const orthogonalX = -(point2.y - point1.y) / length * squiggleDepth;
    const orthogonalY = (point2.x - point1.x) / length * squiggleDepth;
    const points = [];
    let i;
    let x = point1.x;
    let y = point1.y;
    for (i = 0; i < numSquiggles; i++) {
        points.push({ x: x, y: y });
        x += dx / 4;
        y += dy / 4;
        points.push({ x: x + orthogonalX, y: y + orthogonalY });
        x += dx / 4;
        y += dy / 4;
        points.push({ x: x, y: y });
        x += dx / 4;
        y += dy / 4;
        points.push({ x: x - orthogonalX, y: y - orthogonalY });
        x += dx / 4;
        y += dy / 4;
    }
    points.push(point2);
    return points;
}

function interpolate(point1, point2, t) {
    return {
        x: point1.x + (point2.x - point1.x) * t,
        y: point1.y + (point2.y - point1.y) * t
    };
}

function makeResistor(segment, rng) {
    const point1 = segment[0];
    const point2 = segment[1];
    const length = distance(point1, point2);

    const squiggleStart = interpolate(point1, point2, rng.uniform(0.1, 0.4));
    const squiggleEnd = interpolate(point1, point2, rng.uniform(0.6, 0.9));

    let points = [point1];
    points = points.concat(makeSquiggles(squiggleStart, squiggleEnd));
    points.push(point2);

    const parts = [];
    let first = true;
    for (let point of points) {
        if (first) {
            parts.push(`M ${point.x} ${point.y}`)
        } else {
            parts.push(`L ${point.x} ${point.y}`)
        }
        first = false; 
    }
    return parts.join(" ");
}

function generateSeedString() {
    const digits = "0123456789";
    const length = 12;
    const result = [];
    let i;
    for (i = 0; i < length; i++) {
        result.push(digits[Math.floor(Math.random() * digits.length)]);
    }
    return result.join("");
}

const NODE_TYPES = ["dot", "rectangle", "triangle", "label"];
const CURVE_TYPES = ["line", "arc", "squiggle"];

function generate(seedString) {
    const seed = parseInt(seedString, 10);

    const rng = new RNG(seed);
    /*
    const width = 1080;
    const height = 720;
    const pointCount = rng.integer(30, 100);
    */
    const width = 700;
    const height = 400;
    const pointCount = rng.integer(30, 60);

    const poissonRadius = 50;
    const margin = 30;
    const density = rng.uniform(0.5, 1.0);
    const dotDensity = rng.random();

    const pathTypeWeights = {};
    const power = rng.uniform(1, 5);
    for (let pathType of PATH_TYPES) {
        pathTypeWeights[pathType] = Math.pow(rng.random(), power);
    }

    const nodeTypeWeights = [];
    for (let nodeType of NODE_TYPES) {
        nodeTypeWeights.push(Math.pow(rng.uniform(0.1, 1.0), power));
    }

    const curveTypeWeights = [];
    for (let curveType of CURVE_TYPES) {
        curveTypeWeights.push(rng.uniform(0.1, 1.0));
    }

    const draw = SVG().addTo("body").size(width, height);
    const points = generatePoissonDiskSamples(rng, pointCount, width, height, poissonRadius, margin);
    const pairs = [];
    for (i = 0; i < points.length; i++) {
        let j;
        for (j = i + 1; j < points.length; j++) {
            const point1 = points[i];
            const point2 = points[j];
            if (distance(point1, point2) < 150) {
                pairs.push([point1, point2]);
            }
        }
    }
    rng.shuffle(pairs);

    const segments = [];
    for (let pair of pairs) {
        if (rng.random() < density) {
            const path = pickPath(pair, segments, rng, pathTypeWeights);
            if (path !== null) {
                const width = 1.5;
                const type = rng.chooseWeighted(CURVE_TYPES, curveTypeWeights);
                const dasharray = type === "squiggle"
                    ? null
                    : rng.random() < 0.2 ? rng.choose(["10,5", "5,5"]) : null;
                for (let segment of path) {
                    const point1 = segment[0];
                    const point2 = segment[1];
                    const rx = Math.abs(point2.x - point1.x);
                    const ry = Math.abs(point2.y - point1.y);
                    let path;
                    if (type === "line") {
                        path = `M ${point1.x} ${point1.y} L ${point2.x} ${point2.y}`;
                    } else if (type === "arc") {
                        path = `M ${point1.x} ${point1.y} A ${rx} ${ry} 0 0 0 ${point2.x} ${point2.y}`;
                    } else if (type === "squiggle") {
                        path = makeResistor(segment, rng);
                    }
                    draw.path(path).fill("none").stroke({
                        width: width,
                        color: "black",
                        linecap: "round",
                        dasharray: dasharray
                    });
                    segments.push(segment);
                }
            }
        }
    }

    for (let point of points) {
        if (rng.random() < dotDensity) {
            const type = rng.chooseWeighted(NODE_TYPES, nodeTypeWeights);
            if (type === "dot") {
                const radius = rng.choose([3, 5, 10]);
                const strokeWidth = 2;
                const dot = draw.ellipse(radius, radius).attr({ cx: point.x, cy: point.y });
                if (rng.random() < 0.5) {
                    dot.fill("white").stroke({ width: strokeWidth, color: "black" });
                    if (rng.random() < 0.5) {
                        draw.ellipse(radius - strokeWidth * 3, radius - strokeWidth * 3)
                            .attr({ cx: point.x, cy: point.y })
                            .fill("black");
                    }
                }
            } else if (type === "rectangle") {
                const size = rng.choose([3, 5, 10]);
                const rect = draw.rect(size, size)
                    .attr({ x: point.x - size / 2, y: point.y - size / 2 })
                    .fill("white")
                    .stroke({ width: 1.5, color: "black" });
                if (rng.random() < 0.5) {
                    rect.rotate(45);
                }
            } else if (type === "triangle") {
                const size = rng.choose([10, 15]);
                const offset = rng.choose([0, Math.PI]);
                const theta = 2 * Math.PI / 3;
                draw.path(`
                    M ${Math.cos(offset) * size} ${Math.sin(offset) * size}
                    L ${Math.cos(offset + theta) * size} ${Math.sin(offset + theta) * size}
                    L ${Math.cos(offset + 2 * theta) * size} ${Math.sin(offset + 2 * theta) * size}
                    z
                `)
                    .translate(point.x, point.y)
                    .fill("white")
                    .stroke({ width: 1.5, color: "black" });
            } else if (type === "label") {
                const width = 25;
                const height = 21;
                draw.rect(width, height)
                    .attr({
                        x: point.x - width / 2,
                        y: point.y - height / 2,
                        rx: 5,
                        ry: 5
                    })
                    .fill("white")
                    .stroke({ width: 1.5, color: "black" });
                draw.text(rng.choose(rng.choose(["0123456789", "ABCDEFGHIJKLMNOPQRSTUVWXYZ"])))
                    .attr({
                        x: point.x,
                        y: point.y + height * 0.05,
                        "font-family": "sans-serif",
                        "dominant-baseline": "middle",
                        "text-anchor": "middle"
                    })
            }
        }
    }

    return draw;
}

function updateHash(seedString) {
    const baseURL = location.href.split("#")[0];
    location.replace(baseURL + "#" + seedString);
}

function main() {
    const seedString = location.hash !== ""
        ? location.hash.substring(1)
        : generateSeedString();
    let draw = generate(seedString);
    document.querySelector("body").addEventListener("click", () => {
        draw.remove();
        const seedString = generateSeedString();
        updateHash(seedString);
        draw = generate(seedString);
    });
}

main();