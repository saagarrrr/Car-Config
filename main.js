const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas, true);
let selectedMesh = null;
let carMesh = null;
let scene;
let hiddenMeshes = new Set(); // Added for hidden meshes tracking
let availableMeshes = [];

const createScene = function () {
    // Create scene
    scene = new BABYLON.Scene(engine);
    scene.clearColor = BABYLON.Color3.FromHexString("#e5f3fd"); // Blue background
    // Add camera
    const camera = new BABYLON.ArcRotateCamera("camera",
        0, Math.PI / 3, 10, // Alpha, Beta, Radius (adjust radius if needed)
        BABYLON.Vector3.Zero(),
        scene
    );
    camera.attachControl(canvas, true);
    camera.setTarget(BABYLON.Vector3.Zero());

    const hdrTexture = new BABYLON.HDRCubeTexture("assets/1.hdr", scene, 512);
    scene.environmentTexture = hdrTexture;
    scene.createDefaultSkybox(hdrTexture, true, 1000, 0.3); // Adds a skybox

    // Adjust zoom intensity
    camera.wheelPrecision = 65;  // Increase for slower zoom, decrease for faster zoom
    camera.minZ = 0.1;           // Set the closest zoom limit
    camera.lowerRadiusLimit = 5; // Prevent zooming too close
    camera.upperRadiusLimit = 15; // Prevent zooming too far

    camera.setTarget(BABYLON.Vector3.Zero());

    // Add lights
    const light = new BABYLON.HemisphericLight("light",
        new BABYLON.Vector3(0, 1, 0),
        scene
    );
    light.intensity = 5;

    // Load car model
    BABYLON.SceneLoader.ImportMesh("", "assets/", "modelNew2.glb", scene, function (meshes, animationGroups) {
        carMesh = meshes[0];

        // Enable picking on all meshes
        carMesh.getChildMeshes().forEach(mesh => {
            mesh.isPickable = true;
            availableMeshes.push(mesh);
        });

        

        // Log mesh names
        logMeshNames();
        updateHiddenMeshesDropdown();
        createMeshSelectionDropdown();

        // Add mesh picking event
        scene.onPointerObservable.add(function (evt) {
            if (evt.pickInfo.hit && evt.pickInfo.pickedMesh) {
                selectMesh(evt.pickInfo.pickedMesh);
            }
        }, BABYLON.PointerEventTypes.POINTERPICK);

        // Play the first available animation
        if (animationGroups.length > 0) {
            let animation = animationGroups[0]; // Get the first animation
            animation.start(true); // true = loop animation
            console.log("Playing animation:", animation.name);
        }

        // Initialize hidden meshes dropdown
        updateHiddenMeshesDropdown();
    });
    return scene;
};

// Initialize the scene
scene = createScene();


function createMeshSelectionDropdown() {
    let dropdownContainer = document.getElementById('meshSelectionContainer');
    if (!dropdownContainer) {
        dropdownContainer = document.createElement('div');
        dropdownContainer.id = 'meshSelectionContainer';
        dropdownContainer.className = 'mesh-selection-container';
        document.getElementById('colorPicker').insertBefore(dropdownContainer, document.getElementById('meshName').nextSibling);
    }

    let dropdown = document.getElementById('meshSelectionDropdown');
    if (!dropdown) {
        dropdown = document.createElement('select');
        dropdown.id = 'meshSelectionDropdown';
        const defaultOption = document.createElement('option');
        defaultOption.text = 'Select a mesh';
        defaultOption.value = '';
        dropdown.appendChild(defaultOption);
        dropdownContainer.appendChild(dropdown);

        dropdown.addEventListener('change', function (e) {
            const selectedMeshName = e.target.value;
            if (selectedMeshName) {
                const meshToSelect = availableMeshes.find(mesh => mesh.name === selectedMeshName);
                if (meshToSelect) {
                    selectMesh(meshToSelect);
                }
            }
        });
    }

    while (dropdown.options.length > 1) {
        dropdown.remove(1);
    }

    availableMeshes.forEach(mesh => {
        const option = document.createElement('option');
        option.value = mesh.name;
        option.text = mesh.name;
        if (selectedMesh && mesh.name === selectedMesh.name) {
            option.selected = true;
        }
        dropdown.appendChild(option);
    });
}

function updateHiddenMeshesDropdown() {
    // Get or create the dropdown container
    let dropdownContainer = document.getElementById('hiddenMeshesContainer');
    if (!dropdownContainer) {
        dropdownContainer = document.createElement('div');
        dropdownContainer.id = 'hiddenMeshesContainer';
        dropdownContainer.className = 'hidden-meshes-container';
        document.getElementById('colorPicker').insertBefore(dropdownContainer, document.getElementById('meshName').nextSibling);
    }

    // Create or update the dropdown
    let dropdown = document.getElementById('hiddenMeshesDropdown');
    if (!dropdown) {
        dropdown = document.createElement('select');
        dropdown.id = 'hiddenMeshesDropdown';
        const defaultOption = document.createElement('option');
        defaultOption.text = 'Select hidden mesh to show';
        defaultOption.value = '';
        dropdown.appendChild(defaultOption);
        dropdownContainer.appendChild(dropdown);

        // Add change event listener
        dropdown.addEventListener('change', function (e) {
            const selectedMeshName = e.target.value;
            if (selectedMeshName) {
                showMesh(selectedMeshName);
                // Reset dropdown to default option
                dropdown.value = '';
            }
        });
    }

    // Clear existing options (except the first default option)
    while (dropdown.options.length > 1) {
        dropdown.remove(1);
    }

    // Add current hidden meshes to dropdown
    hiddenMeshes.forEach(meshName => {
        const option = document.createElement('option');
        option.value = meshName;
        option.text = meshName;
        dropdown.appendChild(option);
    });

    // Show/hide dropdown based on whether there are hidden meshes
    dropdownContainer.style.display = hiddenMeshes.size > 0 ? 'block' : 'none';
}

function showMesh(meshName) {
    if (!carMesh) return;

    const meshToShow = carMesh.getChildMeshes().find(mesh => mesh.name === meshName);
    if (meshToShow) {
        meshToShow.isVisible = true;
        hiddenMeshes.delete(meshName);
        updateHiddenMeshesDropdown();
    }
}

function resetMaterial() {
    if (!selectedMesh) {
        return;
    }

    if (selectedMesh.material) {
        selectedMesh.material = selectedMesh.material.clone(selectedMesh.name + "_default");

        // Remove textures
        if (selectedMesh.material instanceof BABYLON.PBRMaterial) {
            selectedMesh.material.albedoTexture = null;
            selectedMesh.material.albedoColor = BABYLON.Color3.White();
        } else {
            selectedMesh.material.diffuseTexture = null;
            selectedMesh.material.diffuseColor = BABYLON.Color3.White();
        }
    }
}

function changeColor(color) {
    if (!selectedMesh) {
        return;
    }

    resetMaterial();

    const colorHex = getColorHex(color);

    if (!selectedMesh.material) {
        selectedMesh.material = new BABYLON.PBRMaterial(selectedMesh.name + "_material", scene);
    } else {
        selectedMesh.material = selectedMesh.material.clone(selectedMesh.name + "_material");
    }

    selectedMesh.material.albedoColor = BABYLON.Color3.FromHexString(colorHex);

    // Add roughness and metallicness values
    
    selectedMesh.material.metallic = 1;  // Adjust for more/less metallic effect
    selectedMesh.material.roughness = 0.3; // Adjust for a shinier or matte finish
}

function applyTexture(texturePath) {
    if (!selectedMesh) {
        return;
    }

    resetMaterial();

    const texture = new BABYLON.Texture(texturePath, scene);

    if (!selectedMesh.material) {
        selectedMesh.material = new BABYLON.PBRMaterial(selectedMesh.name + "_material", scene);
    } else {
        selectedMesh.material = selectedMesh.material.clone(selectedMesh.name + "_material");
    }

    selectedMesh.material.albedoTexture = texture;

    // Add roughness and metallicness values
    selectedMesh.material.metallic = 1;  // Adjust for more/less metallic effect
    selectedMesh.material.roughness = 0.2; // Adjust for a shinier or matte finish
}

function getColorHex(color) {
    const colors = {
        red: "#FF0000",
        blue: "#0000FF",
        green: "#00FF00",
        yellow: "#FFFF00",
        purple: "#800080",
        orange: "#FFA500",
        pink: "#FFC0CB",
        brown: "#A52A2A",
        black: "#000000",
        white: "#FFFFFF"
    };
    return colors[color] || "#FFFFFF";
}

function logMeshNames() {
    if (carMesh) {
        carMesh.getChildMeshes().forEach(mesh => {
            console.log(mesh.name);
        });
    }
}

function selectMesh(mesh) {
    selectedMesh = mesh;
    document.getElementById('meshName').innerText = 'Selected: ' + mesh.name;
}

function resetAllMaterials() {
    if (!carMesh) {
        return;
    }

    carMesh.getChildMeshes().forEach(mesh => {
        if (mesh.material) {
            mesh.material = mesh.material.clone(mesh.name + "_default");

            if (mesh.material instanceof BABYLON.PBRMaterial) {
                mesh.material.albedoTexture = null;
                mesh.material.albedoColor = BABYLON.Color3.White();
            } else {
                mesh.material.diffuseTexture = null;
                mesh.material.diffuseColor = BABYLON.Color3.White();
            }
        }
    });
}

function toggleVisibility() {
    if (!selectedMesh) {
        return;
    }

    selectedMesh.isVisible = !selectedMesh.isVisible;
    document.getElementById("toggleButton").innerText = selectedMesh.isVisible ? "Hide Mesh" : "Show Mesh";

    // Update hidden meshes set
    if (!selectedMesh.isVisible) {
        hiddenMeshes.add(selectedMesh.name);
    } else {
        hiddenMeshes.delete(selectedMesh.name);
    }

    // Update the dropdown
    updateHiddenMeshesDropdown();
}

// Add render loop
engine.runRenderLoop(function () {
    scene.render();
});

// Handle window resize
window.addEventListener('resize', function () {
    engine.resize();
});