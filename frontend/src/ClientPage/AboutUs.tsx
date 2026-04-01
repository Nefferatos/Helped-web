import { MapPin, Phone, Mail, Globe, Clock, Facebook } from "lucide-react";

const AboutUs = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 py-12 md:py-20">
        <div className="container max-w-4xl">
          <div className="mb-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
              About <span className="text-primary">Rinzin Agency</span>
            </h1>

            <div className="prose max-w-none font-body text-foreground/90 space-y-4">
              <p>
                <strong>Rinzin Agency : We Specialised in Darjeeling and Manipur maids.</strong>{" "}
                Apart from specialized in North East Indian of Nepali and Tibetan and Manipuri and Mizoram and Nagaland and Assam origin from India. Our strength is also in specially selected Filipino by our staff in Philippines and Myanmar – English and Chinese speaking; Indian race Muslim and some Tamil speaking and some Nepali and Hindi speaking candidates.
              </p>
            </div>
          </div>

          {/* Maid Categories */}
          <div className="bg-card rounded-2xl shadow-sm p-8 mb-8">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              New and Transfer Foreign Domestic Helpers
            </h2>

            <div className="mt-4 space-y-4 font-body text-foreground/90">
              <div>
                <h3 className="font-bold text-foreground underline mb-2">North East Indian:</h3>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Darjeeling Maid & Sikkim Maid</li>
                  <li>Nepalese – Hindu (Vegetarian and Non Vegetarian)</li>
                  <li>Tibetan – Buddhist (Vegetarian and Non Vegetarian)</li>
                  <li>Manipur Maid – Christian/Catholic (English Speaking)</li>
                  <li>Filipino – video conference with them</li>
                  <li>Myanmar</li>
                </ol>
              </div>

              <div>
                <p className="font-semibold">Selectively</p>
                <ul className="list-none space-y-0.5">
                  <li>South Indian</li>
                  <li>Indonesian</li>
                  <li>Punjabi Maid</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Company Description */}
          <div className="bg-card rounded-2xl shadow-sm p-8 mb-8">
            <div className="space-y-4 font-body text-foreground/90 leading-relaxed">
              <p>
                RINZIN has been providing quality Indian, Filipino and Myanmar domestic helpers to Singapore families for the past years.
              </p>
              <p>
                We have built up a fresh new team to give our valued customers a wider choice of workers from other countries (North India and Myanmar).
              </p>
              <p>
                In 2005 Being a Singaporean Chinese, I am the pioneer of North East India and has traveled India far and wide. We are now the first to bring you girls from Lahaul And Spiti, Himachal Pradesh and Ladakh.
              </p>
              <p>We take pride in our services to our clients. Our team is result oriented and is driven to provide you to best.</p>
              <p>
                We do not claim to be "problem free" and we are not tired of problems that maid placement brings, problems make us better. In many occasions, problems brings out the best in us.
              </p>
              <p>
                We are dealing with human beings from different culture and political background. When there are problems, we face them and solve it swiftly. When all revenue to resolve a case fails, we exercise business goodwill and offer reasonable refund with no questions asked.
              </p>
              <p>
                We are committed to provide excellent customer services. Our quality policy is <strong>"The right worker and delivery on time"</strong>.
              </p>
              <p>Our crisis management team is open to SMS to make sure that taking a maid from us is stress FREE.</p>
              <p>
                Call us and you will know that we are <strong>different</strong>. We care for our customers, the employers as much as the FDWs.
              </p>
              <p>Serving you in a professionally with a true heart........</p>
            </div>
          </div>

          {/* International Clients */}
          <div className="bg-accent rounded-2xl p-8">
            <h3 className="font-display text-lg font-bold text-foreground mb-3">Special Notes to International Clients:</h3>
            <p className="font-body text-foreground/90">
              We relocated Fresh or experienced helpers from our datapool to reputable clients in Europe and UK. Visa processing girls have to be done by clients.
            </p>
            <p className="font-body text-foreground/90 mt-2">
              Email us your requirements and we will shortlist suitable girls for you.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AboutUs;