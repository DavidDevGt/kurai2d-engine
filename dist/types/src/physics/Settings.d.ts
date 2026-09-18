export default Settings;
declare namespace Settings {
    let linearSlop: number;
    let angularSlop: number;
    let polygonRadius: number;
    let maxLinearCorrection: number;
    let maxAngularCorrection: number;
    let maxTranslation: number;
    let maxRotation: number;
    let baumgarte: number;
    let toiBaumgarte: number;
    let velocityThreshold: number;
    let timeToSleep: number;
    let linearSleepTolerance: number;
    let angularSleepTolerance: number;
    let aabbExtension: number;
    let aabbMultiplier: number;
    let velocityIterations: number;
    let positionIterations: number;
    let maxTOIIterations: number;
    let maxTOIPasses: number;
}
