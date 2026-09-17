import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Image, SafeAreaView, Platform, StatusBar } from 'react-native';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { useTheme } from '../utils/ThemeContext';
import { sweetAlertRef } from '../utils/sweetAlert';
import { postCandidateRegistration, uploadCandidateFile } from '../utils/api';
import AppIcon from '../components/AppIcon';

export default function CandidateRegistrationScreen({ onNavigateBack }) {
  const { themeColors } = useTheme();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    position_applied: '',
    education: '',
    skills: '',
    portfolio_url: '',
    experience_level: 'Fresher',
    company_name: '',
    company_location: '',
    years_worked: '',
    current_salary: '',
    expected_salary: '',
    why_left: '',
    notice_period: ''
  });
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleDocumentPick = async () => {
    try {
      const res = await pick({
        type: [types.pdf, types.doc, types.docx],
        allowMultiSelection: false,
      });
      if (res && res.length > 0) {
        setResumeFile(res[0]);
      }
    } catch (err) {
      if (!(isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED)) {
        sweetAlertRef.current?.show({
          type: 'error',
          title: 'Error',
          text: 'Failed to pick document.'
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone) {
      sweetAlertRef.current?.show({
        type: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in your name, email, and phone number.'
      });
      return;
    }

    if (form.experience_level === 'Experienced' && (!form.company_name || !form.company_location || !form.years_worked)) {
      sweetAlertRef.current?.show({
        type: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in your company name, location, and years worked.'
      });
      return;
    }

    setLoading(true);
    let finalResumeUrl = '';

    try {
      if (resumeFile) {
        setUploadingResume(true);
        const formData = new FormData();
        formData.append('file', {
          uri: resumeFile.uri,
          type: resumeFile.type,
          name: resumeFile.name,
        });

        const uploadData = await uploadCandidateFile(formData);
        if (uploadData.success && uploadData.fileUrls?.length > 0) {
          finalResumeUrl = uploadData.fileUrls[0];
        } else {
          throw new Error(uploadData.error || 'Failed to upload resume.');
        }
        setUploadingResume(false);
      }

      let experience_details = '';
      if (form.experience_level === 'Experienced') {
        experience_details = `Company: ${form.company_name}
Location: ${form.company_location}
Years Worked: ${form.years_worked}
Current Salary: ${form.current_salary}
Expected Salary: ${form.expected_salary}
Notice Period: ${form.notice_period}
Reason for Leaving: ${form.why_left}`;
      }

      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        position_applied: form.position_applied,
        education: form.education,
        skills: form.skills,
        portfolio_url: form.portfolio_url,
        resume_url: finalResumeUrl,
        experience_level: form.experience_level,
        experience_details,
        notice_period: form.notice_period
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
      setUploadingResume(false);
      sweetAlertRef.current?.show({
        type: 'error',
        title: 'Error',
        text: err.message || 'Network error. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <View style={[styles.card, { 
          backgroundColor: themeColors.card, 
          width: '100%', 
          maxWidth: 400, 
          alignItems: 'center', 
          padding: 30, 
          borderRadius: 24,
          shadowColor: '#10b981',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.15,
          shadowRadius: 20,
          elevation: 10
        }]}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 24
          }}>
            <AppIcon name="check" size={40} color="#10b981" />
          </View>
          
          <Text style={[styles.title, { color: themeColors.text, fontSize: 24, marginBottom: 12, textAlign: 'center' }]}>
            Application Submitted
          </Text>
          
          <Text style={[styles.text, { color: themeColors.textSecondary, textAlign: 'center', lineHeight: 24, marginBottom: 30 }]}>
            Thank you for registering! Our HR team has successfully received your application. Once reviewed, we will send your temporary login ID and password to your registered email address.
          </Text>
          
          <TouchableOpacity 
            style={[styles.buttonPrimary, { width: '100%', paddingVertical: 16, borderRadius: 12 }]} 
            onPress={onNavigateBack}
          >
            <Text style={[styles.buttonText, { fontSize: 16, fontWeight: 'bold' }]}>Back to Welcome</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const SectionTitle = ({ title, icon }) => (
    <View style={styles.sectionTitleContainer}>
      <AppIcon name={icon} size={20} color={themeColors.primary} />
      <Text style={[styles.sectionTitleText, { color: themeColors.text }]}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={[styles.header, { backgroundColor: '#0f172a', paddingTop: Platform.OS === 'android' ? 20 : 10 }]}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButtonTop} 
            onPress={onNavigateBack}
            activeOpacity={0.7}
          >
            <AppIcon name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/flymedia_logo_white.png')} 
              style={styles.logoImage} 
              resizeMode="contain" 
            />
          </View>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Register as a Candidate</Text>
          <Text style={styles.headerSubtitle}>Join Fly Media Technology</Text>
        </View>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Personal Details */}
        
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderWidth: 1 }]}>
          <SectionTitle title="Personal Details" icon="user" />
          
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Full Name *</Text>
          <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholder="John Doe" placeholderTextColor={themeColors.textMuted} value={form.name} onChangeText={(text) => setForm({ ...form, name: text })} />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Email Address *</Text>
          <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholder="john@example.com" placeholderTextColor={themeColors.textMuted} keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(text) => setForm({ ...form, email: text })} />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Phone Number *</Text>
          <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholder="+91 9876543210" placeholderTextColor={themeColors.textMuted} keyboardType="phone-pad" value={form.phone} onChangeText={(text) => setForm({ ...form, phone: text })} />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Current Address</Text>
          <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, minHeight: 60, textAlignVertical: 'top' }]} placeholder="Your full address..." placeholderTextColor={themeColors.textMuted} multiline value={form.address} onChangeText={(text) => setForm({ ...form, address: text })} />
        </View>

        {/* Professional Details */}

        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderWidth: 1, marginTop: 15 }]}>
          <SectionTitle title="Professional Details" icon="briefcase" />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Position Applied For</Text>
          <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholder="e.g. Software Engineer" placeholderTextColor={themeColors.textMuted} value={form.position_applied} onChangeText={(text) => setForm({ ...form, position_applied: text })} />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Highest Education</Text>
          <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholder="e.g. B.Tech Computer Science" placeholderTextColor={themeColors.textMuted} value={form.education} onChangeText={(text) => setForm({ ...form, education: text })} />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Key Skills</Text>
          <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholder="e.g. React, Node.js, SQL" placeholderTextColor={themeColors.textMuted} value={form.skills} onChangeText={(text) => setForm({ ...form, skills: text })} />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Portfolio / LinkedIn URL</Text>
          <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border }]} placeholder="https://" placeholderTextColor={themeColors.textMuted} autoCapitalize="none" value={form.portfolio_url} onChangeText={(text) => setForm({ ...form, portfolio_url: text })} />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Upload Resume (PDF/Word)</Text>
          <TouchableOpacity 
            style={[styles.uploadButton, { borderColor: themeColors.primary, backgroundColor: 'rgba(6, 182, 212, 0.05)' }]} 
            onPress={handleDocumentPick}
            disabled={loading}
          >
            <AppIcon name="upload-cloud" size={20} color={themeColors.primary} />
            <Text style={{ color: themeColors.primary, fontWeight: '600', marginLeft: 8 }}>
              {resumeFile ? resumeFile.name : 'Select Document'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Experience */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderWidth: 1, marginTop: 15 }]}>
          <SectionTitle title="Experience" icon="award" />
          <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 5 }]}>Experience Level</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity style={[styles.radioOption, form.experience_level === 'Fresher' && styles.radioActive]} onPress={() => setForm({ ...form, experience_level: 'Fresher' })}>
              <Text style={{ color: form.experience_level === 'Fresher' ? '#fff' : themeColors.text, fontWeight: '600' }}>Fresher</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.radioOption, form.experience_level === 'Experienced' && styles.radioActive]} onPress={() => setForm({ ...form, experience_level: 'Experienced' })}>
              <Text style={{ color: form.experience_level === 'Experienced' ? '#fff' : themeColors.text, fontWeight: '600' }}>Experienced</Text>
            </TouchableOpacity>
          </View>

          {form.experience_level === 'Experienced' && (
            <View style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: 15, borderRadius: 12, marginTop: 15, borderWidth: 1, borderColor: themeColors.border }}>
              <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 0 }]}>Company Name *</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.card }]} placeholderTextColor={themeColors.textMuted} value={form.company_name} onChangeText={(text) => setForm({ ...form, company_name: text })} placeholder="e.g. Google" />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Company Location *</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.card }]} placeholderTextColor={themeColors.textMuted} value={form.company_location} onChangeText={(text) => setForm({ ...form, company_location: text })} placeholder="e.g. New York, NY" />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Years Worked *</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.card }]} placeholderTextColor={themeColors.textMuted} value={form.years_worked} onChangeText={(text) => setForm({ ...form, years_worked: text })} keyboardType="numeric" placeholder="e.g. 2.5" />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Notice Period</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.card }]} placeholderTextColor={themeColors.textMuted} value={form.notice_period} onChangeText={(text) => setForm({ ...form, notice_period: text })} placeholder="e.g. 30 days" />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Reason for Leaving *</Text>
              <TextInput style={[styles.input, { color: themeColors.text, borderColor: themeColors.border, backgroundColor: themeColors.card, minHeight: 60, textAlignVertical: 'top' }]} placeholderTextColor={themeColors.textMuted} value={form.why_left} onChangeText={(text) => setForm({ ...form, why_left: text })} multiline placeholder="Please explain..." />
            </View>
          )}
        </View>

        <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 25 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <Text style={styles.buttonText}>{uploadingResume ? 'Uploading Resume...' : 'Submitting...'}</Text>
          ) : (
            <Text style={styles.buttonText}>Submit Application</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.buttonSecondary, { marginTop: 15, borderColor: themeColors.border }]} onPress={onNavigateBack} disabled={loading}>
          <Text style={[styles.buttonText, { color: themeColors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonTop: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  logoImage: {
    width: 140,
    height: 40,
  },
  headerTextContainer: {
    alignItems: 'center',
    paddingBottom: 15,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: '#06b6d4',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 10,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
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
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 16,
    marginTop: 5,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioOption: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  radioActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  buttonPrimary: {
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  }
});
