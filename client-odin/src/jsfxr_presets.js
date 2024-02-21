const SFX = {};

const JSFXR_PLAYER_DEATH = {
  "oldParams": true,
  "wave_type": 3,
  "p_env_attack": 0,
  "p_env_sustain": 0.146,
  "p_env_punch": 0.34,
  "p_env_decay": 0.682,
  "p_base_freq": 0.29191116671533823,
  "p_freq_limit": 0,
  "p_freq_ramp": -0.171,
  "p_freq_dramp": 0,
  "p_vib_strength": 0,
  "p_vib_speed": 0,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 0,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0,
  "p_pha_offset": 0,
  "p_pha_ramp": 0,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0,
  "p_hpf_ramp": 0,
  "sound_vol": 0.25,
  "sample_rate": 11025,
  "sample_size": 8
}

SFX.PLAYER_DEATH = sfxr.toAudio(JSFXR_PLAYER_DEATH);
// SFX.PLAYER_DEATH.play();

const JSFXR_ENEMY_DEATH = {
  "oldParams": true,
  "wave_type": 3,
  "p_env_attack": 0,
  "p_env_sustain": 0.146,
  "p_env_punch": 0.34,
  "p_env_decay": 0.516,
  "p_base_freq": 0.29191116671533823,
  "p_freq_limit": 0,
  "p_freq_ramp": -0.217,
  "p_freq_dramp": 0,
  "p_vib_strength": 0,
  "p_vib_speed": 0,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 0,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0,
  "p_pha_offset": 0,
  "p_pha_ramp": 0,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0,
  "p_hpf_ramp": 0,
  "sound_vol": 0.25,
  "sample_rate": 11025,
  "sample_size": 8
}

SFX.ENEMY_DEATH = sfxr.toAudio(JSFXR_ENEMY_DEATH);

const JSFXR_EXPLOSION = {
  "oldParams": true,
  "wave_type": 3,
  "p_env_attack": 0,
  "p_env_sustain": 0.13319494246236924,
  "p_env_punch": 0.6648364348154416,
  "p_env_decay": 0.12139456795379933,
  "p_base_freq": 0.03665698130227344,
  "p_freq_limit": 0,
  "p_freq_ramp": 0.08502019811512262,
  "p_freq_dramp": 0,
  "p_vib_strength": 0.5274586566235788,
  "p_vib_speed": 0.43123974849995844,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 0,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0.6773385022526437,
  "p_pha_offset": -0.2588846618005372,
  "p_pha_ramp": -0.19861840639250428,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0,
  "p_hpf_ramp": 0,
  "sound_vol": 0.25,
  "sample_rate": 44100,
  "sample_size": 8
}


SFX.EXPLOSION = sfxr.toAudio(JSFXR_EXPLOSION);

const JSFXR_EXPLOSION_SHORT = {
  "oldParams": true,
  "wave_type": 3,
  "p_env_attack": 0,
  "p_env_sustain": 0.13319494246236924,
  "p_env_punch": 0.285,
  "p_env_decay": 0.365,
  "p_base_freq": 0.03665698130227344,
  "p_freq_limit": 0,
  "p_freq_ramp": 0.08502019811512262,
  "p_freq_dramp": 0,
  "p_vib_strength": 0.5274586566235788,
  "p_vib_speed": 0.43123974849995844,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 0,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0.6773385022526437,
  "p_pha_offset": -0.2588846618005372,
  "p_pha_ramp": -0.19861840639250428,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0,
  "p_hpf_ramp": 0,
  "sound_vol": 0.25,
  "sample_rate": 44100,
  "sample_size": 8
}

SFX.EXPLOSION_SHORT = sfxr.toAudio(JSFXR_EXPLOSION_SHORT);


const JSFXR_HURT = {
  "oldParams": true,
  "wave_type": 1,
  "p_env_attack": 0,
  "p_env_sustain": 0,
  "p_env_punch": 0,
  "p_env_decay": 0.194,
  "p_base_freq": 0.396,
  "p_freq_limit": 0.201,
  "p_freq_ramp": -0.296,
  "p_freq_dramp": -0.079,
  "p_vib_strength": 0,
  "p_vib_speed": 0,
  "p_arp_mod": 0,
  "p_arp_speed": 0,
  "p_duty": 1,
  "p_duty_ramp": 0,
  "p_repeat_speed": 0,
  "p_pha_offset": 0,
  "p_pha_ramp": 0,
  "p_lpf_freq": 1,
  "p_lpf_ramp": 0,
  "p_lpf_resonance": 0,
  "p_hpf_freq": 0.21582389981362443,
  "p_hpf_ramp": 0,
  "sound_vol": 0.362,
  "sample_rate": 44100,
  "sample_size": 8
}

SFX.HURT = sfxr.toAudio(JSFXR_HURT);





function getSfxById(id) {
  switch(id) {
    case 0: return SFX.PLAYER_DEATH;
    case 1: return SFX.ENEMY_DEATH;
    case 2: return SFX.EXPLOSION;
    case 3: return SFX.EXPLOSION_SHORT;
    case 4: return SFX.HURT;

  }
}