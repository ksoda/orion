$(function() {
  setBoard('#board');
  setBoard('#board2');

  $('.clear').trigger('click');
});

function makePlayer(scaleNames){
  return function(chord) {
    chord.forEach(function(noteid) {
      var sound,
        src = ['sounds/', scaleNames[noteid], '.ogg'].join('');

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

function extra() {
  var chromatic = [
    'C', 'Cs', 'D', 'Ds', 'E',
    'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B',
    'C1', 'Cs1', 'D1', 'Ds1', 'E1',
    'F1', 'Fs1', 'G1', 'Gs1', 'A1', 'As1', 'B1'];

  var playChroma = makePlayer(chromatic);
  var calibration = false;
  if(calibration){
    var ENTER_KEY = 13;
    $('body').append($('<input/>').attr('id','whichkey'));
    $('body').append( $("#log") );
    $( "#whichkey" ).on( "keydown", function( event ) {
      if(event.which==ENTER_KEY) $( "#log" ).append('.');
      else $( "#log" ).append(event.which +',' );
    });
  }

  var keyss =('49,81,65,90,.50,87,83,88,.51,69,68,67,.' +
    '52,82,70,86,.53,84,71,66,.54,89,72,78,.55,85,74,77,.56,73,75,188,')
    .split('.').map(function(x){
      var y=x.split(','); y.pop(); return y;});

  var fd =3; // Eflat
  var keymapss = _.reduce(keyss, function(acc, ks) {
    var major = triads(4), minor = triads(3), seventh = triads(10);
    var pairs = _.zip(ks, [fd, major(fd), minor(fd), seventh(fd)]);
    fd = (fd + 7) % 12; // 5th
    return acc.concat([pairs]);

    function triads (itv) {
      return function(fund) {
        return (fund+itv); //%12
      };
    }
  },[]);
  var keymaps=_.flatten(keymapss, true);

  keymaps.forEach(function(pair) {
    $(window).on('keydown', function(e) {
      if (e.which == pair[0]) {
        console.debug(chromatic[ pair[1] ]);
        playChroma([pair[1]]);
      }
    });

  });

  /************************************/
  window.playRand =playRand;
  function playRand () {
    var highIdx = _.range(5, penta4.length),
      bs = [0,5,7,12],
      baseixs = bs.concat(_.take(bs, 2)),
      mnr =/[D,A]/;

    playMelody();


    var playBase = makeRandomplay(baseixs, playChroma, 1);
    var playGrace = makeRandomplay(
      ottava([4, 11]), playChroma, 2);
    var playGrace2 = makeRandomplay(
      ottava([8, 10]), playChroma, 3);
    playBase(playBase);
    playGrace(playGrace);
    playGrace2(playGrace2);

    function ottava (noteidxs) {
      return _.map(noteidxs, function(nix) {
        return nix+12;
      });
    }

    function rand (s, n) {
      if (_.every(arguments, _.isUndefined))
        return Math.random();
      var m = 500,
        total = _.reduce(_.range(n), function(acc, elm) {
        return acc + Math.random() *s;
      }, 0);

      return total/n+(m-s/2);
    }

    function playMelody() {
      setTimeout(function() {
        if (rand() > 1/3 ) {
          var scix = _.sample(highIdx);
          if (!mnr.test(penta4[scix]) || rand()>2/3)
            play([scix]);
        }
        playMelody();
      }, rand(500, 3) *0.5);
    }

    function makeRandomplay (idxs, gplay, period) {
      return function(callback) {
        setTimeout(function() {
          if (rand() > 1/4) gplay([_.sample(idxs)]);
          callback(callback);
        }, rand(100, 2) * Math.pow(2, Math.pow(2, period)) );
      };
    }

  }
}
