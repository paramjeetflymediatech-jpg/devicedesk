import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { sweetAlertRef } from '../utils/sweetAlert';
import { postCandidateRegistration } from '../utils/api';

export default function CandidateRegistrationScreen({ onNavigateBack }) {
  const { themeColors } = useTheme();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    experience_level: 'Fresher',
    company_name: '',
    company_location: '',
    years_worked: '',
    current_salary: '',
    expected_salary: '',
    why_left: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone) {
      sweetAlertRef.current?.show({
        type: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in your name, email, and phone number.'
      });
      return;
    }

    setLoading(true);
    try {
      let experience_details = '';
      if (form.experience_level === 'Experienced') {
        experience_details = `Company: ${form.company_name}
Location: ${form.company_location}
Years Worked: ${form.years_worked}
Current Salary: ${form.current_salary}
Expected Salary: ${form.expected_salary}
Reason for Leaving: ${form.why_left}`;
      }

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        experience_level: form.experience_level,
        experience_details
      };

      const data = await postCandidateRegistration(payload);
      if (data.success) {
        setSubmitted(true);
      } else {
        sweetAlertRef.current?.show({
          type: 'error',
          title: 'Error',
          text: data.error || 'Failed to submit application.'
        });
      }
    } catch (err) {
      sweetAlertRef.current?.show({
        type: 'error',
        title: 'Error',
        text: 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 20 }}>✅</Text>
          <Text style={[styles.title, { color: themeColors.text }]}>Application Submitted</Text>
          <Text style={[styles.text, { color: themeColors.textSecondary, textAlign: 'center' }]}>
            Thank you for registering. Our HR team has received your application. Once reviewed, you will be provided with a temporary login ID and password to access your test dashboard.
          </Text>
          <TouchableOpacity style={styles.buttonPrimary} onPress={onNavigateBack}>
            <Text style={styles.buttonText}>Back to Welcome</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg }]}>
        <Text style={styles.headerTitle}>Candidate Registration</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: themeColors.card }]}>
          
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Full Name *</Text>
          <TextInput 
            style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} 
            placeholder="John Doe"
            placeholderTextColor={themeColors.textMuted}
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
          />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Email Address *</Text>
          <TextInput 
            style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} 
            placeholder="john@example.com"
            placeholderTextColor={themeColors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
          />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Phone Number *</Text>
          <TextInput 
            style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} 
            placeholder="+91 9876543210"
            placeholderTextColor={themeColors.textMuted}
            keyboardType="phone-pad"
            value={form.phone}
            onChangeText={(text) => setForm({ ...form, phone: text })}
          />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Current Address</Text>
          <TextInput 
            style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, minHeight: 60, textAlignVertical: 'top' }]} 
            placeholder="Your full address..."
            placeholderTextColor={themeColors.textMuted}
            multiline
            value={form.address}
            onChangeText={(text) => setForm({ ...form, address: text })}
          />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Experience Level</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={[styles.radioOption, form.experience_level === 'Fresher' && styles.radioActive]} 
              onPress={() => setForm({ ...form, experience_level: 'Fresher' })}
            >
              <Text style={{ color: form.experience_level === 'Fresher' ? '#fff' : themeColors.text }}>Fresher</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.radioOption, form.experience_level === 'Experienced' && styles.radioActive]} 
              onPress={() => setForm({ ...form, experience_level: 'Experienced' })}
            >
              <Text style={{ color: form.experience_level === 'Experienced' ? '#fff' : themeColors.text }}>Experienced</Text>
            </TouchableOpacity>
          </View>

          {form.experience_level === 'Experienced' && (
            <View style={{ backgroundColor: themeColors.background, padding: 15, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: themeColors.border }}>
              <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 0 }]}>Company Name *</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholderTextColor={themeColors.textMuted} value={form.company_name} onChangeText={(text) => setForm({ ...form, company_name: text })} placeholder="e.g. Google" />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Company Location *</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholderTextColor={themeColors.textMuted} value={form.company_location} onChangeText={(text) => setForm({ ...form, company_location: text })} placeholder="e.g. New York, NY" />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Years Worked *</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholderTextColor={themeColors.textMuted} value={form.years_worked} onChangeText={(text) => setForm({ ...form, years_worked: text })} keyboardType="numeric" placeholder="e.g. 2.5" />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Current Salary</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholderTextColor={themeColors.textMuted} value={form.current_salary} onChangeText={(text) => setForm({ ...form, current_salary: text })} placeholder="e.g. 50k" />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Expected Salary</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholderTextColor={themeColors.textMuted} value={form.expected_salary} onChangeText={(text) => setForm({ ...form, expected_salary: text })} placeholder="e.g. 70k" />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Reason for Leaving *</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, minHeight: 60, textAlignVertical: 'top' }]} placeholderTextColor={themeColors.textMuted} value={form.why_left} onChangeText={(text) => setForm({ ...form, why_left: text })} multiline placeholder="Please explain..." />
            </View>
          )}

          <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 25 }]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Submit Application</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={[styles.buttonSecondary, { marginTop: 15, borderColor: themeColors.border }]} onPress={onNavigateBack} disabled={loading}>
            <Text style={[styles.buttonText, { color: themeColors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 40,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
  },
  card: {
    padding: 25,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 15,
  },
  radioOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  radioActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  buttonPrimary: {
    backgroundColor: '#06b6d4',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
