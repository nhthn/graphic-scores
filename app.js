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
                break;
            }
        }
        points.push(candidate);
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
    let pointMiddle12;
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

const PATH_TYPES = ["line", "manhattan1", "manhattan2", "zigzag"];

function pickPath(segment, existingSegments, rng, weights) {
    const pathTypes = {
        line: [segment],
        manhattan1: manhattanize(segment, false),
        manhattan2: manhattanize(segment, true),
        zigzag: zigzagify(segment, rng)
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

function generate(seed) {
    const rng = new RNG(seed);
    const width = 1000;
    const height = 500;
    const pointCount = 100;
    const margin = 200;
    const density = rng.uniform(0.1, 0.5);
    const dotDensity = rng.random();
    const arcProbability = rng.random();

    const pathTypeWeights = {};
    for (let pathType of PATH_TYPES) {
        pathTypeWeights[pathType] = rng.random();
    }

    const draw = SVG().addTo("body").size(width, height);
    const points = generatePoissonDiskSamples(rng, pointCount, width, height, margin, 50);
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
                for (let segment of path) {
                    const point1 = segment[0];
                    const point2 = segment[1];
                    const rx = Math.abs(point2.x - point1.x);
                    const ry = Math.abs(point2.y - point1.y);
                    const width = rng.choose([1, 2]);
                    draw.path(
                        rng.random() < arcProbability
                            ? `M ${point1.x} ${point1.y} A ${rx} ${ry} 0 0 0 ${point2.x} ${point2.y}`
                            : `M ${point1.x} ${point1.y} L ${point2.x} ${point2.y}`
                    ).fill("none").stroke({
                        width: width,
                        color: "black",
                        linecap: "round",
                        dasharray: rng.random() < 0.2 ? rng.choose(["10,5", "5,5"]) : null
                    });
                    segments.push(segment);
                }
            }
        }
    }

    for (let point of points) {
        if (rng.random() < dotDensity) {
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
        }
    }

    return draw;
}

function main() {
    let draw;
    draw = generate(0);
    setInterval(() => {
        draw.remove();
        draw = generate(Math.random());
    }, Math.floor(1.0 * 1000));
}

main();