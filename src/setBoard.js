import _ from 'lodash'
import $ from 'jquery'
import Bacon from 'baconjs'

export default function (sel) {
    $.fn.asEventStream = Bacon.$.asEventStream
    BoardHelper.drawBoard(sel);

    // stream
    var mouseDown = $(sel).asEventStream("mousedown")
        .doAction(".preventDefault");

    var mouseUp = $(document).asEventStream("mouseup")
        .doAction(".preventDefault");

    var mouseMoves = $(document).asEventStream("mousemove")
        .skipDuplicates(cellsAreEqual);

    var drawLines = mouseDown.flatMap(() => mouseMoves.takeUntil(mouseUp));

    var clickCell = $(sel).find('.cell').asEventStream('click')
        .doAction(".preventDefault");

    var clear = $(sel).find('.clear').asEventStream('click');
    var tick = $('#tick').asEventStream('click');

    var board = clear.flatMapLatest(genBoards);
    var draw = BoardHelper.makeDrawer(sel);
    var interval = Bacon.interval(1000 / 4);

    var // interval = tick,
    compass = interval.map(1).scan(0, (time, delta) => mod(time + delta, BoardHelper.X));

    var chord = compass.combine(board, (t, b) => b[t]).sampledBy(compass);

    // subscribe
    compass.combine(board, (t, b) => draw(t, b)).onValue();

    chord.onValue(c => play(c));

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
            $(e.originalEvent.srcElement.parentNode).index(),
            BoardHelper.Y - 1 - $(e.target).index()];
    }

    function assocToArray(hash){
        return _.reduce(_.range(32), (memo, x) => {
            memo[x] = hash[x] || [];
            return memo;
        }, []);
    }

    function cellsAreEqual (l, r) {
        return l.target == r.target;
    }
}

function makePlayer(scaleNames){
  return chord => {
    chord.forEach(noteid => {
        var sound;
        var src = ['sounds/', scaleNames[noteid], '.ogg'].join('');

        if(_.isEmpty(scaleNames[noteid]) ) console.error(noteid);
        sound = new Audio(src);
        sound.play();
    });
  };
}

var penta4 = ['C','D','F','G','A',
              'C1','D1','F1','G1','A1',
              'C2','D2','F2','G2','A2',
              'C3','D3','F3','G3','A3'];

var play = makePlayer(penta4);


var BoardHelper;
((BoardHelper => {
    BoardHelper.NumOctaveCell = 5;
    BoardHelper.X = Math.pow(2, 5);
    BoardHelper.Y = 4 * BoardHelper.NumOctaveCell;

    function drawBoard(sel) {
        var board = $(sel);
        _(BoardHelper.X).times(() => {
            var col = $('<div class="col"/>');
            board.append(col);
            _(BoardHelper.Y).times(i => {
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
        return (time, bd) => {
            board.find('.col').removeClass('now');
            board.find('.col').eq(time).addClass('now');
            board.find('.cell').removeClass('active');
            bd.forEach((ch, t) => {
                ch.forEach(n => {
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
    function arrayToJSON(ary){
        return _.object(_.range(ary.length), _.isArray(ary[0]) ?
            _.map(ary, arrayToJSON) : ary);
    }
}))(BoardHelper || (BoardHelper = {}));

var Board = ((() => {
    function Board(duration) {
        this.body = _.chain(_.range(duration)).map(() => []).value();
    }
    Board.switchBoard = (body, pair) => {
        var time = pair[0];
        var note = pair[1];
        return body.map((ch, t) => t == time ? switchChord(ch, note) : ch);

        function switchChord(chord, note) {
            return _.includes(chord, note) ?
            _.without(chord, note) : chord.concat([note]);
        }
    };
    Board.plus = (board, other) => {
        for(i=0; i < 32; i++){
            board[i] = _.union(board[i], other[i]);
        }
        return board;
    };

    return Board;
}))();

function mod(x, y) {
    return (x % y + y) % y;
}
