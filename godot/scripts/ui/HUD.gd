class_name HUD
extends CanvasLayer

signal salt_requested()
signal restart_requested()
signal next_stage_requested()
signal mode_changed(new_mode: String)

@onready var score_label: Label = $TopBar/ScoreLabel
@onready var lives_label: Label = $TopBar/LivesLabel
@onready var occupancy_bar: ProgressBar = $TopBar/OccupancyBar
@onready var hype_bar: ProgressBar = $TopBar/HypeBar
@onready var stage_label: Label = $SubBar/StageLabel
@onready var banner_panel: PanelContainer = $BannerContainer
@onready var banner_jp: Label = $BannerContainer/VBox/JapaneseLabel
@onready var banner_en: Label = $BannerContainer/VBox/EnglishLabel
@onready var overflow_label: Label = $OverflowContainer/OverflowLabel
@onready var salt_btn: Button = $BottomBar/SaltButton
@onready var mode_btn: Button = $BottomBar/ModeButton
@onready var game_over_panel: PanelContainer = $GameOverPanel
@onready var final_score_label: Label = $GameOverPanel/VBox/FinalScoreLabel
@onready var restart_btn: Button = $GameOverPanel/VBox/RestartBtn
@onready var victory_panel: PanelContainer = $VictoryPanel
@onready var victory_title: Label = $VictoryPanel/VBox/Title
@onready var victory_desc: Label = $VictoryPanel/VBox/DescLabel
@onready var next_stage_btn: Button = $VictoryPanel/VBox/NextBtn

var banner_timer: float = 0.0

func _ready() -> void:
	Juice.banner_requested.connect(_on_banner_requested)
	if banner_panel:
		banner_panel.modulate.a = 0.0
	if game_over_panel:
		game_over_panel.visible = false
	if victory_panel:
		victory_panel.visible = false
	if overflow_label:
		overflow_label.visible = false

	if salt_btn:
		salt_btn.pressed.connect(func(): salt_requested.emit())
	if restart_btn:
		restart_btn.pressed.connect(func(): restart_requested.emit())
	if next_stage_btn:
		next_stage_btn.pressed.connect(func(): next_stage_requested.emit())
	if mode_btn:
		mode_btn.pressed.connect(_on_mode_cycle)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_S:
			salt_requested.emit()
		elif event.keycode == KEY_M:
			_on_mode_cycle()
		elif event.keycode == KEY_R and (game_over_panel.visible or victory_panel.visible):
			restart_requested.emit()

func _process(delta: float) -> void:
	if banner_timer > 0.0:
		banner_timer -= delta
		if banner_timer <= 0.0 and banner_panel:
			var tween = create_tween()
			tween.tween_property(banner_panel, "modulate:a", 0.0, 0.25)

func _on_mode_cycle() -> void:
	mode_changed.emit("CYCLE")

func set_mode_info(mode_title: String, detail: String) -> void:
	if stage_label:
		stage_label.text = mode_title + " • " + detail
	if mode_btn:
		mode_btn.text = "🏆 " + mode_title

func update_score(score: int) -> void:
	if score_label:
		score_label.text = "SCORE: %d" % score

func update_lives(lives: int) -> void:
	if lives_label:
		var hearts = ""
		for i in range(lives):
			hearts += "❤️ "
		lives_label.text = "LIVES: " + (hearts if hearts != "" else "💀")

func update_occupancy(ratio: float) -> void:
	if occupancy_bar:
		occupancy_bar.value = ratio * 100.0

func update_overflow_warning(overflow_timer: float, is_overflowing: bool) -> void:
	if overflow_label:
		if is_overflowing:
			overflow_label.visible = true
			var remain = maxf(0.0, 2.0 - overflow_timer)
			overflow_label.text = "⚠️ 物言い！ DOHYŌ OVERFLOW: %.1fs" % remain
			overflow_label.modulate = Color("#E74C3C") if fmod(overflow_timer, 0.2) < 0.1 else Color("#FFFFFF")
		else:
			overflow_label.visible = false

func update_hype(hype: float, fever: bool) -> void:
	if hype_bar:
		hype_bar.value = hype
		hype_bar.modulate = Color("#FFD700") if fever else Color("#E67E22")

func update_salt(charges: int) -> void:
	if salt_btn:
		salt_btn.text = "🧂 SALT [S] (%d)" % charges
		salt_btn.disabled = charges <= 0

func _on_banner_requested(japanese: String, english: String, col: Color) -> void:
	if not banner_panel: return
	banner_jp.text = japanese
	banner_jp.modulate = col
	banner_en.text = english
	banner_panel.modulate.a = 1.0
	banner_timer = 2.0

func show_game_over(final_score: int, reason: String = "MATCH CONCLUDED") -> void:
	if game_over_panel:
		$GameOverPanel/VBox/Title.text = reason
		final_score_label.text = "FINAL SCORE: %d" % final_score
		game_over_panel.visible = true

func show_victory(stage_name: String, is_championship: bool) -> void:
	if victory_panel:
		victory_title.text = "🏆 YOKOZUNA PROMOTION!" if is_championship else "勝負あり！ BOUT WON!"
		victory_desc.text = "Defeated " + stage_name + "!"
		next_stage_btn.text = "PLAY AGAIN" if is_championship else "NEXT BOUT ➔"
		victory_panel.visible = true

func hide_panels() -> void:
	if game_over_panel:
		game_over_panel.visible = false
	if victory_panel:
		victory_panel.visible = false
