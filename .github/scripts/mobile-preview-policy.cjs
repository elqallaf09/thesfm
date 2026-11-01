// A simulator build cannot validate account isolation or MFA against a real backend.
function requiresMobilePreview(files) {
  return files.some(file => [file.filename, file.previous_filename].some(path => typeof path === 'string' && (
    /^(apps\/(expo-go|native-shared|sfm-finance|sfm-investor|sfm-business)\/|ios-native\/)/.test(path)
    || /^src\/(app\/api\/mobile\/|lib\/(mobile\/|server\/mobile))/.test(path)
  )));
}
module.exports = { requiresMobilePreview };
