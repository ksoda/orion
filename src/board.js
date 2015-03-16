var myFirebaseRef;
function setBoard(sel) {
    BoardHelper.drawBoard(sel);
    // stream
    var
    mouseDown = $(sel).asEventStream("mousedown")
        .doAction(".preventDefault"),
    mouseUp = $(document).asEventStream("mouseup")
        .doAction(".preventDefault"),
    mouseMoves = $(document).asEventStream("mousemove")
        .skipDuplicates(cellsAreEqual),
    drawLines = mouseDown.flatMap(function () {
        return mouseMoves.takeUntil(mouseUp);
    }),
    clickCell = $(sel).find('.cell').asEventStream('click')
        .doAction(".preventDefault"),
    clear = $(sel).find('.clear').asEventStream('click'),
    tick = $('#tick').asEventStream('click');


    // var board = remote.combine(bd, Board.plus).log();
    var remote = Bacon.fromEvent(myFirebaseRef, 'value')
    .map(function(snapshot){
        return assocToArray(snapshot.val().board);
    });
    var bd = clear.flatMapLatest(genBoards);
    var board = bd.combine(remote, Board.plus);

    var
    draw = BoardHelper.makeDrawer(sel),
    interval = Bacon.interval(1000 / 4),
    // interval = tick,
    compass = interval.map(1).scan(0, function (time, delta) {
        return mod(time + delta, BoardHelper.X);
    }),
    chord = compass.combine(board, function (t, b) {
        return b[t];
    }).sampledBy(compass);

    // subscribe
    compass.combine(board, function (t, b) {
        return draw(t, b);
    }).onValue();

    chord.onValue(function (c) {
        return play(c);
    });

    // -> stream
    function remoteBoards(){
    }

    // -> stream
    function genBoards() {
        var seed = new Board(BoardHelper.X).body;
        var board = drawLines.map(toCoordinate).merge(clickCell.map(toCoordinate))
        .scan(seed, Board.switchBoard);
        return board;
    }

    function toCoordinate(e) {
        return [
            $(e.srcElement.parentNode).index(),
            BoardHelper.Y - 1 - $(e.target).index()];
    }

    function assocToArray(hash){
        return _.reduce(_.range(32), function(memo, x) {
            memo[x] = hash[x] || [];
            return memo;
        }, []);
    }

    function cellsAreEqual (l, r) {
        return l.target == r.target;
    }
}

var BoardHelper;
(function (BoardHelper) {
    BoardHelper.NumOctaveCell = 5;
    BoardHelper.X = Math.pow(2, 5);
    BoardHelper.Y = 4 * BoardHelper.NumOctaveCell;

    function drawBoard(sel) {
        var board = $(sel);
        _(BoardHelper.X).times(function () {
            var col = $('<div class="col"/>');
            board.append(col);
            _(BoardHelper.Y).times(function (i) {
                var $cell = $('<div class="cell"/>');
                $cell.addClass('scale'+scale(i));
                col.append($cell);

            });
        });
        board.append('<button class="clear"> clear <button>');
    }
    BoardHelper.drawBoard = drawBoard;

    function makeDrawer(sel) {
        var board = $(sel);
        return function (time, bd) {
            var throttledSync = _.throttle(sync, 3000, {leading: false});
            if(!time && sel == '#board2') throttledSync(bd);
            board.find('.col').removeClass('now');
            board.find('.col').eq(time).addClass('now');
            board.find('.cell').removeClass('active');
            bd.forEach(function (ch, t) {
                ch.forEach(function (n) {
                    board.find('.col').eq(t).find('.cell')
                    .eq(BoardHelper.Y - 1 - n).addClass('active');
                });
            });
        };
    }
    BoardHelper.makeDrawer = makeDrawer;
    function scale(i){
        return (BoardHelper.Y - i - 1) % BoardHelper.NumOctaveCell;
    }
    function sync(board){
        return myFirebaseRef.set({
            board: arrayToJSON(board)
        });
    }
    function arrayToJSON(ary){
        return _.object(_.range(ary.length), _.isArray(ary[0]) ?
            _.map(ary, arrayToJSON) : ary);
    }
})(BoardHelper || (BoardHelper = {}));

var Board = (function () {
    function Board(duration) {
        this.body = _.chain(_.range(duration)).map(function () {
            return [];
        }).value();
    }
    Board.switchBoard = function (body, pair) {
        var time = pair[0], note = pair[1];
        return body.map(function (ch, t) {
            return t == time ? switchChord(ch, note) : ch;
        });

        function switchChord(chord, note) {
            return _.contains(chord, note) ?
            _.without(chord, note) : chord.concat([note]);
        }
    };
    Board.plus = function(board, other) {
        for(i=0; i < 32; i++){
            board[i] = _.union(board[i], other[i]);
        }
        return board;
    };

    return Board;
})();

function mod(x, y) {
    return (x % y + y) % y;
}
