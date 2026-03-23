import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * AppModal — branded replacement for system Alert
 *
 * Info usage:
 *   <AppModal visible={modal.visible} icon="✅" title="Done" message="Saved!" onClose={hideModal} />
 *
 * Confirm usage:
 *   <AppModal visible={modal.visible} icon="⚠️" title="Delete?" message="Sure?"
 *     confirmText="Delete" confirmDestructive onClose={hideModal} onConfirm={handleDelete} />
 */
export default function AppModal({
  visible,
  icon,
  title,
  message,
  onClose,
  // optional confirm mode
  confirmText,
  cancelText = 'Cancel',
  confirmDestructive = false,
  onConfirm,
}) {
  const isConfirm = !!onConfirm;

  return (
    <Modal transparent animationType="fade" visible={!!visible} onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.box}>
          {icon ? <Text style={s.icon}>{icon}</Text> : null}
          <Text style={s.title}>{title}</Text>
          {message ? <Text style={s.message}>{message}</Text> : null}

          {isConfirm ? (
            <View style={s.btnRow}>
              <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                <Text style={s.cancelText}>{cancelText}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmBtn, confirmDestructive && s.destructiveBtn]}
                onPress={() => { onClose(); onConfirm(); }}
              >
                <Text style={s.confirmText}>{confirmText}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.okBtn} onPress={onClose}>
              <Text style={s.okText}>Got it</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  icon: { fontSize: 44, marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', color: '#222', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  okBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 48,
  },
  okText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#eee',
    alignItems: 'center',
  },
  cancelText: { color: '#666', fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
  },
  destructiveBtn: { backgroundColor: '#ff4444' },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
