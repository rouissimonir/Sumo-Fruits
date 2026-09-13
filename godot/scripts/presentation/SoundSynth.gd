extends Node

var playback: AudioStreamGeneratorPlayback
var player: AudioStreamPlayer
var sample_rate: float = 22050.0

func _ready() -> void:
	player = AudioStreamPlayer.new()
	var generator = AudioStreamGenerator.new()
	generator.mix_rate = sample_rate
	generator.buffer_length = 0.1
	player.stream = generator
	add_child(player)
	player.play()
	playback = player.get_stream_playback()

func _fill_sine(freq: float, duration: float, volume: float = 0.5, pitch_decay: float = 0.0) -> void:
	if not playback: return
	var frames = int(duration * sample_rate)
	var phase = 0.0
	for i in range(frames):
		var t = float(i) / sample_rate
		var envelope = exp(-t * (4.0 / duration))
		var current_freq = maxf(20.0, freq - pitch_decay * t)
		var sample = sin(phase) * volume * envelope
		phase += 2.0 * PI * current_freq / sample_rate
		if playback.can_push_buffer(1):
			playback.push_frame(Vector2(sample, sample))

func play_taiko() -> void:
	_fill_sine(110.0, 0.28, 0.7, 180.0)

func play_hyoshigi() -> void:
	_fill_sine(1200.0, 0.08, 0.4, 400.0)

func play_slap() -> void:
	_fill_sine(340.0, 0.12, 0.5, 500.0)

func play_splat() -> void:
	_fill_sine(180.0, 0.22, 0.6, 250.0)

func play_salt() -> void:
	_fill_sine(1800.0, 0.18, 0.35, -200.0)

func play_rim_save() -> void:
	_fill_sine(650.0, 0.25, 0.45, -150.0)

func play_ringout() -> void:
	_fill_sine(80.0, 0.45, 0.65, 60.0)
