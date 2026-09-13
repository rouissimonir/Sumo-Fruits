shader_type canvas_item;

uniform vec2 impact_uv = vec2(0.5, 0.5);
uniform float elapsed = 0.0;
uniform float strength = 0.08;
uniform float speed = 1.2;
uniform float width = 0.15;
uniform float frequency = 20.0;
uniform float decay = 3.5;

void fragment() {
	vec2 diff = UV - impact_uv;
	float r = length(diff);
	float r_wave = speed * elapsed;
	
	if (r > 0.001) {
		vec2 dir = diff / r;
		float wave_dist = r - r_wave;
		float envelope = exp(-pow(wave_dist / width, 2.0)) * exp(-decay * elapsed);
		float w = sin(frequency * wave_dist) * envelope * strength;
		vec2 displaced_uv = UV + dir * w;
		COLOR = texture(TEXTURE, displaced_uv);
	} else {
		COLOR = texture(TEXTURE, UV);
	}
}
