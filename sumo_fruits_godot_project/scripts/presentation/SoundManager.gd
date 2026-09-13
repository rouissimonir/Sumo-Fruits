extends Node

var enabled: bool = true
var volume: float = 0.7

func toggle_mute() -> bool:
	enabled = not enabled
	return enabled

func set_volume(value: float) -> void:
	volume = clampf(value, 0.0, 1.0)

func _tone(frequency: float, duration: float, amplitude: float = 0.25, end_frequency: float = -1.0, waveform: String = "SINE", delay: float = 0.0) -> void:
	if not enabled:
		return
	if delay > 0.0:
		await get_tree().create_timer(delay, true, false, true).timeout
	var mix_rate := 22050
	var sample_count := maxi(1, int(duration * mix_rate))
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	var phase := 0.0
	for index in range(sample_count):
		var progress := float(index) / float(sample_count)
		var current_frequency := frequency if end_frequency < 0.0 else lerpf(frequency, end_frequency, progress)
		phase += TAU * current_frequency / mix_rate
		var sample := sin(phase)
		if waveform == "TRIANGLE":
			sample = 2.0 / PI * asin(sin(phase))
		elif waveform == "SAW":
			sample = 2.0 * (phase / TAU - floor(phase / TAU + 0.5))
		var envelope := pow(1.0 - progress, 2.4)
		bytes.encode_s16(index * 2, int(clampf(sample * amplitude * envelope, -1.0, 1.0) * 32767.0))
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = mix_rate
	stream.stereo = false
	stream.data = bytes
	var player := AudioStreamPlayer.new()
	player.stream = stream
	player.volume_db = linear_to_db(maxf(0.001, volume))
	add_child(player)
	player.finished.connect(player.queue_free)
	player.play()

func play_hyoshigi(pitch: float = 1.0) -> void:
	_tone(1760.0 * pitch, 0.13, 0.24, -1.0, "TRIANGLE")
	_tone(2240.0 * pitch, 0.13, 0.18, -1.0, "TRIANGLE", 0.015)

func play_taiko(intensity: float = 1.0) -> void:
	_tone(140.0, 0.42, minf(0.72, 0.34 * intensity), 38.0)

func play_launch(mass_value: float) -> void:
	var base := maxf(100.0, 320.0 - mass_value * 1.5)
	_tone(base, 0.18, 0.32, base * 2.2)

func play_bump(speed: float, mass_value: float) -> void:
	var frequency := maxf(80.0, 260.0 - minf(mass_value * 2.0, 140.0))
	_tone(frequency, 0.09, minf(0.38, speed / 400.0 * 0.35), frequency * 0.6, "TRIANGLE")

func play_clash() -> void:
	play_hyoshigi(0.85)
	play_taiko(0.9)

func play_fusion(tier: int) -> void:
	var base := 220.0 * pow(1.08, tier)
	for index in range(4):
		var ratio: float = float([1.0, 1.25, 1.5, 2.0][index])
		_tone(base * ratio, 0.3, 0.19, -1.0, "TRIANGLE", index * 0.03)

func play_ring_out() -> void:
	_tone(480.0, 0.38, 0.26, 70.0, "SAW")

func play_yokozuna() -> void:
	var notes := [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5]
	for index in range(notes.size()):
		_tone(notes[index], 0.62, 0.22, -1.0, "TRIANGLE", index * 0.08)
	play_taiko(1.8)

func play_salt() -> void:
	for index in range(4):
		_tone([1760.0, 2637.0, 3520.0, 4186.0][index], 0.45, 0.15, -1.0, "SINE", index * 0.04)

func play_hazard_clear() -> void:
	_tone(350.0, 0.2, 0.2, 700.0)

func play_wasabi() -> void:
	_tone(140.0, 0.16, 0.26, 60.0)

func play_chili() -> void:
	_tone(220.0, 0.26, 0.28, 880.0, "SAW")

func play_rim_save() -> void:
	for index in range(3):
		_tone([440.0, 554.37, 659.25][index], 0.35, 0.16, -1.0, "SINE", index * 0.05)

func play_flourish() -> void:
	play_taiko(1.4)
	_tone(110.0, 0.3, 0.34, 55.0, "SINE", 0.09)
	_tone(1500.0, 0.16, 0.2, -1.0, "TRIANGLE", 0.24)
