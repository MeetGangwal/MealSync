import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.*;

public class TestPasswords {
    public static void main(String[] args) {
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        Map<String, String> hashes = new LinkedHashMap<>();
        hashes.put("aryan@spit.edu", "$2a$10$SehWeKWW2ZfhuWNqW/B3T.3fNIHcKitAeJ2uub/m/OYF80RJHKUL2");
        hashes.put("meet@gmail.com", "$2a$10$bvluuvcjkhCUVUay4GMp/eLEC9cbNB6cu1bEQUhyn8.UxFxx03Zp6");
        hashes.put("admin@spit.mess", "$2a$10$0QfmJuWsCVlUNQw/hIHnn.lax0ujG2bdpCwXPt3AF4jH8avghx2IC");
        hashes.put("meet.student@spit.edu", "$2a$10$2UECl24AoiKif648XzIWKurpiWX4dn7Tfv9ZLDkD4khFXfYv41uBK");

        List<String> candidates = Arrays.asList(
            "admin123", "password123", "admin", "password", "Admin@123", "admin@123",
            "Meet@1209", "meet1209", "meet123", "Meet@123", "meet", "Aryan@123", "aryan123",
            "123456", "12345678", "admin@spit.mess", "aryan@spit.edu", "meet@gmail.com",
            "spit123", "spit@123"
        );

        for (Map.Entry<String, String> entry : hashes.entrySet()) {
            String user = entry.getKey();
            String hash = entry.getValue();
            System.out.println("Testing user: " + user);
            boolean found = false;
            for (String cand : candidates) {
                if (encoder.matches(cand, hash)) {
                    System.out.println("  --> MATCH FOUND: \"" + cand + "\"");
                    found = true;
                    break;
                }
            }
            if (!found) {
                System.out.println("  --> NO MATCH among tested candidates.");
            }
        }
    }
}
