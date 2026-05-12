const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Force the Kotlin version in the root build.gradle buildscript.
 */
const withKotlinVersion = (config, version = '2.1.0') => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = setKotlinVersion(
        config.modResults.contents,
        version
      );
    } else {
      throw new Error(
        'Cannot set Kotlin version because the build.gradle is not Groovy'
      );
    }
    return config;
  });
};

function setKotlinVersion(buildGradle, version) {
  // Replace the kotlinVersion variable in buildscript ext
  const pattern = /kotlinVersion\s*=\s*['"][^'"]*['"]/;
  if (buildGradle.match(pattern)) {
    return buildGradle.replace(pattern, `kotlinVersion = '${version}'`);
  }
  
  // If not found, try to inject it into the ext block
  const extPattern = /ext\s*\{/;
  if (buildGradle.match(extPattern)) {
    return buildGradle.replace(extPattern, `ext {\n        kotlinVersion = '${version}'`);
  }

  return buildGradle;
}

module.exports = withKotlinVersion;
