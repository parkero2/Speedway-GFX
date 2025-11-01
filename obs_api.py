import obspython as obs
import time

# --- Settings and Variables ---
scene_list = ["Quiz", "Intro", "GFX"] # <--- CUSTOMIZE THIS LIST
cycle_interval = 10.0 # seconds
current_scene_index = 0
timer_active = False

# --- Core Logic Functions ---

def cycle_scenes():
    """Switches the OBS active scene to the next one in the list."""
    global current_scene_index
    global scene_list

    # Get the next index (loop back to 0 if at the end of the list)
    current_scene_index = (current_scene_index + 1) % len(scene_list)

    # Get the target scene name
    target_scene_name = scene_list[current_scene_index]

    # Find and set the scene
    scene = obs.obs_get_scene_by_name(target_scene_name)

    if scene is not None:
        obs.obs_frontend_set_current_scene(scene)
        obs.obs_scene_release(scene) # Release the reference
        print(f"OBS Script: Switched to scene: {target_scene_name}")
    else:
        print(f"OBS Script ERROR: Scene not found: {target_scene_name}")


# --- OBS Scripting Functions (Required) ---

def script_description():
    """Returns the description displayed in the OBS Scripts window."""
    return "Cycles through a specified list of scenes at a set interval."

def script_update(settings):
    """Called when script settings are updated or when the script is loaded/reloaded."""
    global cycle_interval
    global timer_active

    # Stop any existing timer
    if timer_active:
        obs.timer_remove(cycle_scenes)
        timer_active = False

    # Get the interval from the script settings (default to 10.0 if not set)
    cycle_interval = obs.obs_data_get_double(settings, "interval")

    # Start the new timer
    # obs.timer_add takes time in milliseconds, so multiply by 1000
    obs.timer_add(cycle_scenes, int(cycle_interval * 1000))
    timer_active = True
    print("OBS Script: Timer started.")


def script_properties():
    """Creates the properties/settings interface for the script."""
    props = obs.obs_properties_create()

    # Add a setting for the interval duration
    obs.obs_properties_add_float(
        props,
        "interval",
        "Cycle Interval (seconds)",
        1.0, # minimum
        600.0, # maximum
        0.1 # step
    )

    # Note: For simplicity, the scene list is hardcoded in the script.
    # A more advanced script would use a string list property to configure scenes.

    return props

def script_unload():
    """Called when the script is unloaded (e.g., when OBS closes or script is removed)."""
    global timer_active
    if timer_active:
        obs.timer_remove(cycle_scenes)
        timer_active = False
        print("OBS Script: Timer stopped on unload.")