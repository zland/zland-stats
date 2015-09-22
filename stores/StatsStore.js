/*!
 * Copyright 2015 Florian Biewald
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var ChangeEventEmitter = require('core/ChangeEventEmitter');
var assign = require('object-assign');
var Dispatcher = require('core/Dispatcher');
var math = require('core/math');

var PlayerService = require('player/services/PlayerService');
var MapConstants = require('map/Constants');
var CrosshairConstants = require('crosshair/Constants');
var PlayerConstants = require('player/Constants');
var ZombieConstants = require('zombie/Constants');

var MapStore = require('map/stores/MapStore');
var PlayerStore = require('player/stores/PlayerStore');
var PlayerService = require('player/services/PlayerService');
var AuthService = require('core/services/AuthService');
var DistanceService = require('core/services/DistanceService');
var StatsService = require('stats/services/StatsService');

var _stats = PlayerService.getPlayer().get('stats');
var _firstPosition = null;
var _isPositionSend = false;
var _lastPosition = null;

function calculateMeters() {
  if (!_lastPosition) {
    _lastPosition = MapStore.getMapPosition();
    return;
  }
  _stats = _stats.set(
    'distance', _stats.get('distance') + DistanceService.calculateMeters(MapStore.getMapPosition(), _lastPosition)
  );
  PlayerService.updatePlayer(
    PlayerService.getPlayer().set('stats', _stats)
  );

  StatsStore.emitChange();
  _lastPosition = MapStore.getMapPosition();
}

function sendFirstPosition() {
  return AuthService.position(_firstPosition);
}

var StatsStore = assign({}, ChangeEventEmitter, {
  getDistance: function() {
    return _stats.get('distance');
  },

  getShotsFired: function() {
    return _stats.get('shotsFired');
  },

  getZombieHits: function() {
    return _stats.get('zombieHit');
  },

  getDeaths: function() {
    return _stats.get('deaths');
  },

  getZombiesShot: function() {
    return _stats.get('zombiesShot');
  }
});

StatsStore.dispatchToken = Dispatcher.register(function(action) {
  switch(action.type) {
    case MapConstants.MAP_CENTER:
      calculateMeters();

      if (_isPositionSend || !PlayerStore.isAuthenticated()) {
        return;
      }

      _isPositionSend = true;
      _firstPosition = MapStore.getPosition();
      sendFirstPosition();
      StatsService.start(PlayerService);
      break;
    case CrosshairConstants.CROSSHAIR_SHOOT:
      _stats = _stats.set('shotsFired', _stats.get('shotsFired') + 1);
      PlayerService.updatePlayer(PlayerService.getPlayer().set('stats', _stats));
      StatsStore.emitChange();
      break;
    case PlayerConstants.PLAYER_DIED:
      _stats = _stats.set('deaths', _stats.get('deaths') + 1);
      PlayerService.updatePlayer(PlayerService.getPlayer().set('stats', _stats));
      StatsStore.emitChange();
      break;
    case ZombieConstants.ZOMBIE_DIED:
      _stats = _stats.set('zombiesShot', _stats.get('zombiesShot') + 1);
      PlayerService.updatePlayer(PlayerService.getPlayer().set('stats', _stats));
      StatsStore.emitChange();
      break;
    case ZombieConstants.ZOMBIE_HIT:
      _stats = _stats.set('zombieHit', _stats.get('zombieHit') + 1);
      PlayerService.updatePlayer(PlayerService.getPlayer().set('stats', _stats));
      StatsStore.emitChange();
      break;
    case ZombieConstants.ZOMBIE_HEAD_SHOT:
      _stats = _stats.set('headShots', _stats.get('headShots') + 1);
      PlayerService.updatePlayer(PlayerService.getPlayer().set('stats', _stats));
      StatsStore.emitChange();
      break;
  }
});

module.exports = StatsStore;
